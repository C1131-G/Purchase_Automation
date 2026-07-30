/** Object codes used in IC_DOCUMENT_MAPPING, notifications, retry actions. */
export const IC_OBJECT = {
  /** @deprecated Prefer AR_INVOICE — kept for legacy document-map rows. */
  AR_DRAFT: "AR_DRAFT",
  AR_INVOICE: "AR_INVOICE",
  PO: "PO",
  PQ: "PQ",
  /** @deprecated Prefer PQ — kept for legacy document-map / history rows. */
  PQ_DRAFT: "PQ_DRAFT",
  RFQ: "RFQ",
  SQ: "SQ",
} as const;

export type IcObjectCode = (typeof IC_OBJECT)[keyof typeof IC_OBJECT];
