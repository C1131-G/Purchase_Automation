/** Object codes used in IC_DOCUMENT_MAPPING, notifications, retry actions. */
export const IC_OBJECT = {
  /** Flow 2 target: A/R Invoice Draft (ODRF ObjType 13). */
  AR_DRAFT: "AR_DRAFT",
  /** @deprecated Prefer AR_DRAFT — kept for legacy real-invoice map rows. */
  AR_INVOICE: "AR_INVOICE",
  /** Flow 2 POS handoff stored in the seller tenant ParkedTransactions table. */
  PARKED_TRANSACTION: "PARKED_TRANSACTION",
  PO: "PO",
  PQ: "PQ",
  /** @deprecated Prefer PQ — kept for legacy document-map / history rows. */
  PQ_DRAFT: "PQ_DRAFT",
  RFQ: "RFQ",
  SQ: "SQ",
} as const;

export type IcObjectCode = (typeof IC_OBJECT)[keyof typeof IC_OBJECT];
