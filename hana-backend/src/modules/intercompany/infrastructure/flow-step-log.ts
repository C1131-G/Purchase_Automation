/**
 * Numbered step logging for IC Flow 1 / Flow 2.
 * Every gate and action should call logFlowStep so operators can follow the full chain.
 */

import { IC_LOG_SCOPE, icLog, type IcLogFields, type IcLogOutcome } from "./ic-logger";

export type FlowStepContext = IcLogFields & {
  corrId?: string;
  flow?: "flow1" | "flow2";
};

/** Drop null/undefined keys so step logs stay readable. */
const compactFields = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== null && value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return out;
};

const summarizeLines = (lines: unknown[] | undefined) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { itemCodes: [] as string[], lineCount: 0, lines: [] as Record<string, unknown>[] };
  }
  const mapped = lines.map((raw, index) => {
    const line = (raw ?? {}) as Record<string, unknown>;
    const itemDescription = String(
      line.ItemDescription ?? line.Dscription ?? line.ItemName ?? line.description ?? "",
    ).trim();
    const requiredQuantity = line.RequiredQuantity ?? line.requiredQuantity;
    const uomCode = line.UoMCode ?? line.UomCode ?? line.uomCode;
    const uomEntry = line.UoMEntry ?? line.UomEntry ?? line.uomEntry;
    const discountPercent = line.DiscountPercent ?? line.discountPercent;
    return compactFields({
      discountPercent:
        discountPercent == null || Number(discountPercent) === 0 ? undefined : discountPercent,
      itemCode: String(line.ItemCode ?? line.itemCode ?? "").trim() || undefined,
      itemDescription: itemDescription || undefined,
      lineNum: line.LineNum ?? line.lineNum ?? index,
      quantity: line.Quantity ?? line.quantity,
      requiredQuantity:
        requiredQuantity == null || requiredQuantity === "" ? undefined : requiredQuantity,
      unitPrice: line.UnitPrice ?? line.Price ?? line.unitPrice,
      uomCode: uomCode == null || String(uomCode).trim() === "" ? undefined : uomCode,
      uomEntry:
        uomEntry == null || !Number.isFinite(Number(uomEntry)) || Number(uomEntry) <= 0
          ? undefined
          : uomEntry,
      vatGroup: line.VatGroup ?? line.vatGroup,
      warehouseCode: line.WarehouseCode ?? line.warehouseCode,
    });
  });
  return {
    itemCodes: mapped.map((line) => String(line.itemCode ?? "").trim()).filter(Boolean),
    lineCount: mapped.length,
    lines: mapped,
  };
};

export const summarizeIcLines = summarizeLines;

export const summarizePartner = (partner: {
  vendorCode?: string;
  buyerCustomerCode?: string;
  buyerCompany?: {
    companyId?: number;
    companyCode?: string;
    companyName?: string;
    sapDbName?: string;
  };
  sellerCompany?: {
    companyId?: number;
    companyCode?: string;
    companyName?: string;
    sapDbName?: string;
  };
}) => ({
  buyerCompanyCode: partner.buyerCompany?.companyCode ?? null,
  buyerCompanyId: partner.buyerCompany?.companyId ?? null,
  buyerCompanyName: partner.buyerCompany?.companyName ?? null,
  buyerCustomerCode: partner.buyerCustomerCode ?? null,
  buyerSapDb: partner.buyerCompany?.sapDbName ?? null,
  sellerCompanyCode: partner.sellerCompany?.companyCode ?? null,
  sellerCompanyId: partner.sellerCompany?.companyId ?? null,
  sellerCompanyName: partner.sellerCompany?.companyName ?? null,
  sellerSapDb: partner.sellerCompany?.sapDbName ?? null,
  vendorCode: partner.vendorCode ?? null,
});

/**
 * Log one numbered flow step. Message format: `[step/total] title`
 * Always includes step, stepTotal, stepName, flow for filtering.
 */
export const logFlowStep = (
  scope: string,
  params: {
    step: number;
    total: number;
    title: string;
    outcome?: IcLogOutcome;
    check?: string;
    ctx?: FlowStepContext;
    detail?: Record<string, unknown>;
  },
): void => {
  const outcome = params.outcome ?? "pass";
  const level = outcome === "fail" ? "error" : outcome === "skip" ? "info" : "info";
  const msg = `[${params.step}/${params.total}] ${params.title}`;
  const fields: IcLogFields = {
    ...params.ctx,
    ...params.detail,
    check: params.check ?? params.title,
    outcome,
    step: params.step,
    stepName: params.title,
    stepTotal: params.total,
  };

  if (level === "error") {
    icLog.error(scope, msg, fields);
  } else {
    icLog.info(scope, msg, fields);
  }
};

/**
 * Full Flow 1 chain — one continuous counter (n/18).
 *
 *  1–8   PQ draft → RFQ created (seller inbox)
 *  9–12  Seller update + submit RFQ
 * 13–17  Auto convert: prices → PQ → SQ → complete RFQ
 * 18     Full chain done
 */
export const FLOW1_TOTAL = 18 as const;

/** Steps 1–8 — PQ draft save → RFQ created. */
export const FLOW1_STEPS = {
  START: { step: 1, total: FLOW1_TOTAL, title: "Flow 1 — PQ draft saved" },
  INPUT: { step: 2, total: FLOW1_TOTAL, title: "Flow 1 — input snapshot" },
  CAPTURE: { step: 3, total: FLOW1_TOTAL, title: "Flow 1 — capture & partner resolve" },
  PARTNER: { step: 4, total: FLOW1_TOTAL, title: "Flow 1 — partner companies resolved" },
  CREATE_RFQ: { step: 5, total: FLOW1_TOTAL, title: "Flow 1 — create RFQ from draft" },
  RFQ_RESULT: { step: 6, total: FLOW1_TOTAL, title: "Flow 1 — RFQ + document map result" },
  NOTIFY: { step: 7, total: FLOW1_TOTAL, title: "Flow 1 — notify seller company" },
  COMPLETE: {
    step: 8,
    total: FLOW1_TOTAL,
    title: "Flow 1 — RFQ created (seller fill next)",
  },
} as const;

/** Steps 9–13 + 18 — seller fill/submit then wrap full chain. */
export const FLOW1_FILL_STEPS = {
  UPDATE_START: {
    step: 9,
    total: FLOW1_TOTAL,
    title: "Flow 1 — seller update RFQ lines",
  },
  UPDATE_OK: { step: 10, total: FLOW1_TOTAL, title: "Flow 1 — RFQ lines saved" },
  SUBMIT_START: { step: 11, total: FLOW1_TOTAL, title: "Flow 1 — seller submit RFQ" },
  SUBMIT_OK: {
    step: 12,
    total: FLOW1_TOTAL,
    title: "Flow 1 — RFQ submitted (status SUBMITTED)",
  },
  CONVERT_START: {
    step: 13,
    total: FLOW1_TOTAL,
    title: "Flow 1 — auto convert start (draft→PQ + seller SQ)",
  },
  COMPLETE: {
    step: 18,
    total: FLOW1_TOTAL,
    title: "Flow 1 complete — full chain (PQ draft → RFQ → PQ → SQ)",
  },
} as const;

/** Steps 13–17 — convert internals (submit auto or HTTP convert). */
export const FLOW1_CONVERT_STEPS = {
  START: {
    step: 13,
    total: FLOW1_TOTAL,
    title: "Flow 1 — convert prechecks",
  },
  APPLY_PRICES: {
    step: 14,
    total: FLOW1_TOTAL,
    title: "Flow 1 — apply prices to PQ draft",
  },
  DRAFT_TO_PQ: {
    step: 15,
    total: FLOW1_TOTAL,
    title: "Flow 1 — PQ draft → real PQ",
  },
  CREATE_SQ: {
    step: 16,
    total: FLOW1_TOTAL,
    title: "Flow 1 — create seller SQ",
  },
  COMPLETE: {
    step: 17,
    total: FLOW1_TOTAL,
    title: "Flow 1 — convert done (RFQ COMPLETED, maps + notify)",
  },
} as const;

/**
 * Retry of failed Flow 1 step 17 (SQ create after PQ posted).
 * Same step number as the original failure so logs correlate.
 */
export const FLOW1_RETRY_STEPS = {
  START: {
    step: 17,
    total: FLOW1_TOTAL,
    title: "Flow 1 — retry create seller SQ (step 17)",
  },
  SUCCESS: {
    step: 17,
    total: FLOW1_TOTAL,
    title: "Flow 1 — retry SQ success (step 17)",
  },
  FAIL: {
    step: 17,
    total: FLOW1_TOTAL,
    title: "Flow 1 — retry SQ failed (step 17)",
  },
  DEAD: {
    step: 17,
    total: FLOW1_TOTAL,
    title: "Flow 1 — retry SQ dead (step 17)",
  },
} as const;

export const FLOW2_TOTAL = 9 as const;

export const FLOW2_STEPS = {
  START: { step: 1, total: FLOW2_TOTAL, title: "Flow 2 start — PO created" },
  INPUT: { step: 2, total: FLOW2_TOTAL, title: "Flow 2 input snapshot" },
  CAPTURE: { step: 3, total: FLOW2_TOTAL, title: "Flow 2 capture & partner resolve" },
  PARTNER: { step: 4, total: FLOW2_TOTAL, title: "Flow 2 partner companies resolved" },
  BUILD: { step: 5, total: FLOW2_TOTAL, title: "Flow 2 build AR invoice draft payload" },
  PAYLOAD: { step: 6, total: FLOW2_TOTAL, title: "Flow 2 AR draft SAP request body" },
  POST: { step: 7, total: FLOW2_TOTAL, title: "Flow 2 post AR draft to seller SAP" },
  MAP_NOTIFY: { step: 8, total: FLOW2_TOTAL, title: "Flow 2 document map + notify" },
  COMPLETE: { step: 9, total: FLOW2_TOTAL, title: "Flow 2 complete" },
} as const;

/**
 * Retry of failed Flow 2 SL post (step 7). Same number as original failure.
 */
export const FLOW2_RETRY_STEPS = {
  START: {
    step: 7,
    total: FLOW2_TOTAL,
    title: "Flow 2 — retry post AR draft (step 7)",
  },
  SUCCESS: {
    step: 7,
    total: FLOW2_TOTAL,
    title: "Flow 2 — retry AR draft success (step 7)",
  },
  FAIL: {
    step: 7,
    total: FLOW2_TOTAL,
    title: "Flow 2 — retry AR draft failed (step 7)",
  },
  DEAD: {
    step: 7,
    total: FLOW2_TOTAL,
    title: "Flow 2 — retry AR draft dead (step 7)",
  },
} as const;

export const FLOW1_SCOPE = IC_LOG_SCOPE.FLOW1;
export const FLOW2_SCOPE = IC_LOG_SCOPE.FLOW2;
