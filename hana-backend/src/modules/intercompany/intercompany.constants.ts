/** SAP B1 object type for Purchase Order. */
export const SAP_OBJECT_TYPE_PURCHASE_ORDER = "22";

/** SAP B1 object type for A/R Invoice (also used on AR invoice drafts via DocObjectCode). */
export const SAP_OBJECT_TYPE_AR_INVOICE = "13";

export const INTERCOMPANY_STATUS_CREATED = "CREATED" as const;
export const INTERCOMPANY_STATUS_FAILED = "FAILED" as const;

/** Phase 1 company DB names. */
export const IC_SOURCE_DB_AJAX = "AJAX_POS_DB";
export const IC_TARGET_DB_RCM = "RCM_TESTING_POS";

/**
 * Explicit Phase 1 tax map: source input tax → target output tax.
 * Key: `${sourceDb}|${targetDb}` → { [sourceVatGroup]: targetVatGroup }
 */
export const INTERCOMPANY_TAX_CODE_MAP: Record<string, Record<string, string>> = {
  [`${IC_SOURCE_DB_AJAX}|${IC_TARGET_DB_RCM}`]: {
    "IN-12.5": "GSTO",
  },
};

/**
 * Default UoM code when source only has a numeric UoMEntry (do not copy source entry ids).
 * Phase 1: AJAX UoMEntry 1 / UomCode EACH → target EACH.
 */
export const INTERCOMPANY_DEFAULT_UOM_CODE = "EACH";

/** Preferred UoM code for AJAX → RCM when source UoM resolves to EACH (or known AJAX entry). */
export const INTERCOMPANY_ROUTE_DEFAULT_UOM: Record<string, string> = {
  [`${IC_SOURCE_DB_AJAX}|${IC_TARGET_DB_RCM}`]: "EACH",
};

/** SAP OVTG.Category for output (sales) tax. */
export const SAP_TAX_CATEGORY_OUTPUT = "O";

/**
 * Phase 1 quick fix: RCM multi-branch requires a branch on A/R invoice drafts.
 * Default to main branch BPLId = 1 until route-based branch mapping exists.
 */
export const DEFAULT_TARGET_BRANCH = 1;
