/** Global IC configuration keys (IC_CONFIGURATION). */
export const IC_CONFIG_KEY = {
  DETECT_DRAFT_CRON_MINUTES: "DETECT_DRAFT_CRON_MINUTES",
  ENABLE_FLOW1_RFQ_CHAIN: "ENABLE_FLOW1_RFQ_CHAIN",
  ENABLE_FLOW2_DIRECT_PO: "ENABLE_FLOW2_DIRECT_PO",
  MAX_RETRY_COUNT: "MAX_RETRY_COUNT",
  REMARKS_PREFIX: "REMARKS_PREFIX",
  RETRY_DELAY_MINUTES: "RETRY_DELAY_MINUTES",
  SL_SESSION_TIMEOUT_MINUTES: "SL_SESSION_TIMEOUT_MINUTES",
} as const;

export type IcConfigKey = (typeof IC_CONFIG_KEY)[keyof typeof IC_CONFIG_KEY];

export const IC_DOC_MAP_STATUS = {
  ERROR: "ERROR",
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
} as const;

export const IC_RFQ_STATUS = {
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
} as const;

export const IC_RETRY_STATUS = {
  DEAD: "DEAD",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  WAITING: "WAITING",
} as const;

export const DEFAULT_MAX_RETRY = 2;

/** SAP B1 object type for A/R Invoice (also used on AR invoice drafts via DocObjectCode). */
export const SAP_OBJECT_TYPE_AR_INVOICE = "13";

/** Retry / history action codes. */
export const IC_ACTION = {
  FLOW2_CREATE_AR_DRAFT: "FLOW2_CREATE_AR_DRAFT",
  FLOW2_MAP_NOTIFY: "FLOW2_MAP_NOTIFY",
} as const;

/** Default remarks prefix when IC_CONFIGURATION.REMARKS_PREFIX is unset. */
export const DEFAULT_REMARKS_PREFIX = "IC-PO";
