// Target-company master-data checks before posting AR Invoice Draft.

import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";

import { SAP_TAX_CATEGORY_OUTPUT } from "./intercompany.constants";

const LOG_SCOPE = "intercompany.sync";

export interface PreflightCheckInput {
  targetDb: string;
  customerCode: string;
  lines: Array<{
    ItemCode?: unknown;
    WarehouseCode?: unknown;
    VatGroup?: unknown;
    UoMCode?: unknown;
    UomCode?: unknown;
  }>;
}

export interface PreflightResult {
  passed: boolean;
  missing: string[];
}

const asRows = (result: unknown): Array<Record<string, unknown>> =>
  Array.isArray(result) ? (result as Array<Record<string, unknown>>) : [];

const existsOne = async (targetDb: string, sql: string, params: unknown[]): Promise<boolean> =>
  asRows(await executeTenantQuery(targetDb, sql, params)).length > 0;

const uniqueTrimmed = (values: unknown[]): string[] => [
  ...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
];

const pushMissing = (missing: string[], label: string, exists: boolean): void => {
  if (!exists) {
    missing.push(label);
  }
};

const checkCustomer = async (
  targetDb: string,
  customerCode: string,
  missing: string[],
): Promise<void> => {
  try {
    const customerExists = await existsOne(
      targetDb,
      `SELECT "CardCode" FROM "OCRD" WHERE "CardCode" = ? AND "CardType" = 'C'`,
      [customerCode],
    );
    pushMissing(missing, `customer ${customerCode} (OCRD CardType=C)`, customerExists);
    logger.info({
      scope: LOG_SCOPE,
      step: "preflight_customer",
      outcome: customerExists ? "success" : "failure",
      targetDb,
      customerCode,
      msg: customerExists ? "Target customer exists" : "Target customer missing",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    missing.push(`customer ${customerCode} (OCRD query failed: ${message})`);
  }
};

const checkCodes = async (
  targetDb: string,
  codes: string[],
  step: string,
  sql: string,
  labelPrefix: string,
  missing: string[],
): Promise<void> => {
  for (const code of codes) {
    try {
      const codeExists = await existsOne(targetDb, sql, [code]);
      pushMissing(missing, `${labelPrefix} ${code}`, codeExists);
      logger.info({
        scope: LOG_SCOPE,
        step,
        outcome: codeExists ? "success" : "failure",
        targetDb,
        code,
        msg: codeExists ? `${labelPrefix} exists` : `${labelPrefix} missing`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      missing.push(`${labelPrefix} ${code} (query failed: ${message})`);
    }
  }
};

const checkOutputTax = async (
  targetDb: string,
  taxCodes: string[],
  missing: string[],
): Promise<void> => {
  for (const taxCode of taxCodes) {
    try {
      const rows = asRows(
        await executeTenantQuery(
          targetDb,
          `SELECT "Code", "Category", "Rate" FROM "OVTG" WHERE "Code" = ?`,
          [taxCode],
        ),
      );
      const category = rows[0]?.Category != null ? String(rows[0].Category).trim() : "";
      const exists = Boolean(rows[0]);
      const isOutput = category === SAP_TAX_CATEGORY_OUTPUT;
      if (!exists) {
        missing.push(`tax ${taxCode} (OVTG)`);
      } else if (!isOutput) {
        missing.push(
          `tax ${taxCode} (OVTG Category='${category || "?"}', expected '${SAP_TAX_CATEGORY_OUTPUT}')`,
        );
      }
      logger.info({
        scope: LOG_SCOPE,
        step: "preflight_tax",
        outcome: exists && isOutput ? "success" : "failure",
        targetDb,
        taxCode,
        category: category || null,
        msg: exists && isOutput ? "Target output tax exists" : "Target tax invalid",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      missing.push(`tax ${taxCode} (OVTG query failed: ${message})`);
    }
  }
};

const checkItemWarehouses = async (
  targetDb: string,
  lines: PreflightCheckInput["lines"],
  missing: string[],
): Promise<void> => {
  const pairs = uniqueTrimmed(
    lines.map((line) => {
      const itemCode = String(line.ItemCode ?? "").trim();
      const warehouseCode = String(line.WarehouseCode ?? "").trim();
      return itemCode && warehouseCode ? `${itemCode}|${warehouseCode}` : "";
    }),
  );

  for (const pair of pairs) {
    const [itemCode, warehouseCode] = pair.split("|");
    try {
      const stockRowExists = await existsOne(
        targetDb,
        `SELECT "ItemCode" FROM "OITW" WHERE "ItemCode" = ? AND "WhsCode" = ?`,
        [itemCode, warehouseCode],
      );
      pushMissing(missing, `item-warehouse ${itemCode}/${warehouseCode} (OITW)`, stockRowExists);
      logger.info({
        scope: LOG_SCOPE,
        step: "preflight_item_warehouse",
        outcome: stockRowExists ? "success" : "failure",
        targetDb,
        itemCode,
        warehouseCode,
        msg: stockRowExists ? "Target item-warehouse exists" : "Target item-warehouse missing",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      missing.push(`item-warehouse ${itemCode}/${warehouseCode} (OITW query failed: ${message})`);
    }
  }
};

export const preflightTargetArDraft = async (
  input: PreflightCheckInput,
): Promise<PreflightResult> => {
  const targetDb = input.targetDb.trim();
  const customerCode = input.customerCode.trim();
  const missing: string[] = [];

  logger.info({
    scope: LOG_SCOPE,
    step: "preflight_start",
    targetDb,
    customerCode,
    lineCount: input.lines.length,
    msg: "Starting intercompany target preflight validation",
  });

  await checkCustomer(targetDb, customerCode, missing);
  await checkCodes(
    targetDb,
    uniqueTrimmed(input.lines.map((line) => line.ItemCode)),
    "preflight_item",
    `SELECT "ItemCode" FROM "OITM" WHERE "ItemCode" = ?`,
    "item",
    missing,
  );
  await checkCodes(
    targetDb,
    uniqueTrimmed(input.lines.map((line) => line.WarehouseCode)),
    "preflight_warehouse",
    `SELECT "WhsCode" FROM "OWHS" WHERE "WhsCode" = ?`,
    "warehouse",
    missing,
  );
  await checkOutputTax(targetDb, uniqueTrimmed(input.lines.map((line) => line.VatGroup)), missing);
  await checkCodes(
    targetDb,
    uniqueTrimmed(input.lines.map((line) => line.UoMCode ?? line.UomCode)),
    "preflight_uom",
    `SELECT "UomCode" FROM "OUOM" WHERE "UomCode" = ?`,
    "uom",
    missing,
  );
  await checkItemWarehouses(targetDb, input.lines, missing);

  const passed = missing.length === 0;
  logger.info({
    scope: LOG_SCOPE,
    step: "preflight_complete",
    outcome: passed ? "success" : "failure",
    targetDb,
    missing,
    msg: passed
      ? "Intercompany preflight passed"
      : "Intercompany preflight failed; /Drafts will not be called",
  });

  return { passed, missing };
};

export const formatPreflightErrorMessage = (missing: string[]): string =>
  `Intercompany preflight failed; missing on target: ${missing.join("; ")}`.slice(0, 2000);
