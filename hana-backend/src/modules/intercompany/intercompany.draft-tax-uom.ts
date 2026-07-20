// Tax + UoM mapping for intercompany draft lines (Phase 1 constants).

import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";

import {
  INTERCOMPANY_DEFAULT_UOM_CODE,
  INTERCOMPANY_ROUTE_DEFAULT_UOM,
  INTERCOMPANY_TAX_CODE_MAP,
} from "./intercompany.constants";

const LOG_SCOPE = "intercompany.sync";

const routeKey = (sourceDb: string, targetDb: string): string =>
  `${sourceDb.trim()}|${targetDb.trim()}`;

/** Phase 1: AJAX IN-12.5 → RCM GSTO. Unknown codes pass through. */
export const resolveTargetTaxCode = (
  sourceDb: string,
  targetDb: string,
  sourceVatGroup: string | undefined | null,
): string => {
  const sourceTax = String(sourceVatGroup ?? "").trim();
  if (!sourceTax) {
    return "";
  }

  const mapped = INTERCOMPANY_TAX_CODE_MAP[routeKey(sourceDb, targetDb)]?.[sourceTax];
  const targetVatGroup = mapped ?? sourceTax;

  logger.info({
    scope: LOG_SCOPE,
    step: "resolve_target_tax",
    outcome: mapped ? "mapped" : "passthrough",
    sourceDb,
    targetDb,
    sourceVatGroup: sourceTax,
    targetVatGroup,
    msg: mapped
      ? "Mapped source tax code to target output tax"
      : "No tax map for route; passing source VatGroup through",
  });

  return targetVatGroup;
};

export interface ResolvedTargetUom {
  uomCode?: string;
  uomEntry?: number;
  sourceUomCode?: string;
  sourceUomEntry?: number;
}

const queryUomCodeByEntry = async (dbName: string, uomEntry: number): Promise<string | null> => {
  const rows = (await executeTenantQuery(
    dbName,
    `SELECT "UomCode" FROM "OUOM" WHERE "UomEntry" = ?`,
    [uomEntry],
  )) as Array<{ UomCode?: string }>;
  const code = rows?.[0]?.UomCode;
  return code != null && String(code).trim() ? String(code).trim() : null;
};

const queryUomEntryByCode = async (dbName: string, uomCode: string): Promise<number | null> => {
  const rows = (await executeTenantQuery(
    dbName,
    `SELECT "UomEntry" FROM "OUOM" WHERE "UomCode" = ?`,
    [uomCode],
  )) as Array<{ UomEntry?: number | string }>;
  const entry = Number(rows?.[0]?.UomEntry);
  return Number.isFinite(entry) && entry > 0 ? Math.trunc(entry) : null;
};

/** Resolve target UoM by code; never copy source UoMEntry across companies. */
export const resolveTargetUom = async (params: {
  sourceDb: string;
  targetDb: string;
  sourceUomEntry?: unknown;
  sourceUomCode?: unknown;
}): Promise<ResolvedTargetUom> => {
  const { sourceDb, targetDb } = params;
  const rawEntry = Number(params.sourceUomEntry);
  const sourceUomEntry =
    Number.isFinite(rawEntry) && rawEntry > 0 ? Math.trunc(rawEntry) : undefined;
  let sourceUomCode = params.sourceUomCode == null ? "" : String(params.sourceUomCode).trim();

  if (!sourceUomCode && sourceUomEntry != null) {
    try {
      sourceUomCode = (await queryUomCodeByEntry(sourceDb, sourceUomEntry)) ?? "";
    } catch (err: unknown) {
      logger.warn({
        scope: LOG_SCOPE,
        step: "resolve_source_uom_code",
        outcome: "failure",
        err: err instanceof Error ? err : new Error(String(err)),
        sourceDb,
        sourceUomEntry,
        msg: "Failed to resolve source UoMEntry; will use route default",
      });
    }
  }

  const routeDefault =
    INTERCOMPANY_ROUTE_DEFAULT_UOM[routeKey(sourceDb, targetDb)] ?? INTERCOMPANY_DEFAULT_UOM_CODE;
  const targetUomCode = sourceUomCode || routeDefault;

  let targetUomEntry: number | undefined;
  try {
    const entry = await queryUomEntryByCode(targetDb, targetUomCode);
    if (entry != null) {
      targetUomEntry = entry;
    }
  } catch (err: unknown) {
    logger.warn({
      scope: LOG_SCOPE,
      step: "resolve_target_uom_entry",
      outcome: "failure",
      err: err instanceof Error ? err : new Error(String(err)),
      targetDb,
      targetUomCode,
      msg: "Failed to resolve target UoMEntry; will send UoMCode only",
    });
  }

  logger.info({
    scope: LOG_SCOPE,
    step: "resolve_target_uom",
    outcome: "success",
    sourceDb,
    targetDb,
    sourceUomEntry: sourceUomEntry ?? null,
    sourceUomCode: sourceUomCode || null,
    targetUomCode,
    targetUomEntry: targetUomEntry ?? null,
    msg: "Resolved target UoM (code-based; source entry not copied)",
  });

  return {
    uomCode: targetUomCode,
    uomEntry: targetUomEntry,
    sourceUomCode: sourceUomCode || undefined,
    sourceUomEntry,
  };
};

export const normalizeDraftDocumentLines = async (params: {
  sourceDb: string;
  targetDb: string;
  lines: Record<string, unknown>[];
}): Promise<Record<string, unknown>[]> => {
  const { sourceDb, targetDb, lines } = params;
  const normalized: Record<string, unknown>[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? {};
    const sourceVat = line.VatGroup != null ? String(line.VatGroup) : "";
    const targetVat = resolveTargetTaxCode(sourceDb, targetDb, sourceVat);
    const uom = await resolveTargetUom({
      sourceDb,
      targetDb,
      sourceUomEntry: line.UoMEntry ?? line.UomEntry,
      sourceUomCode: line.UoMCode ?? line.UomCode,
    });

    const nextLine: Record<string, unknown> = {
      ItemCode: line.ItemCode,
      Quantity: line.Quantity,
      UnitPrice: line.UnitPrice ?? line.Price,
      DiscountPercent: Number(line.DiscountPercent ?? 0),
      VatGroup: targetVat || undefined,
      WarehouseCode: line.WarehouseCode,
    };

    if (uom.uomEntry != null && uom.uomEntry > 0) {
      nextLine.UoMEntry = uom.uomEntry;
      nextLine.UoMCode = uom.uomCode;
      nextLine.UseBaseUnit = "tNO";
    } else if (uom.uomCode) {
      nextLine.UoMCode = uom.uomCode;
      nextLine.UseBaseUnit = "tNO";
    }

    logger.info({
      scope: LOG_SCOPE,
      step: "normalize_draft_line",
      lineIndex,
      itemCode: nextLine.ItemCode,
      warehouseCode: nextLine.WarehouseCode,
      sourceVatGroup: sourceVat || null,
      targetVatGroup: nextLine.VatGroup ?? null,
      targetUomCode: nextLine.UoMCode ?? null,
      targetUomEntry: nextLine.UoMEntry ?? null,
      msg: "Normalized intercompany draft line tax and UoM",
    });

    normalized.push(nextLine);
  }

  return normalized;
};
