/** Object codes used in IC_DOCUMENT_MAPPING, notifications, retry actions. */
export const IC_OBJECT = {
  AR_DRAFT: "AR_DRAFT",
  PO: "PO",
  PQ: "PQ",
  PQ_DRAFT: "PQ_DRAFT",
  RFQ: "RFQ",
  SQ: "SQ",
} as const;

export type IcObjectCode = (typeof IC_OBJECT)[keyof typeof IC_OBJECT];
