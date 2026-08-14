import { z } from "zod";

/**
 * SAP Business One marketing-document and payment field lengths
 * from the DI API / HANA tables (CardCode 15, Comments 254, …).
 */
export const SAP_FIELD_MAX = {
  address: 254,
  attachmentFreeText: 254,
  bankAccount: 50,
  bankBranch: 50,
  bankCode: 30,
  cardCode: 15,
  cardName: 100,
  checkNumberDigits: 10,
  comments: 254,
  countryCode: 3,
  docCurrency: 3,
  glAccount: 15,
  itemCode: 50,
  itemDescription: 200,
  issuedBy: 100,
  journalMemo: 50,
  lotNumber: 36,
  manufacturerSerial: 20,
  numAtCard: 100,
  transferReference: 27,
  uomCode: 20,
  vatGroup: 8,
  warehouseCode: 8,
} as const;

export const sapOptionalText = (max: number) => z.string().max(max).optional();

/** UI `documentBranchPayload` — keep both keys so Zod does not strip/reject branch. */
export const sapDocumentBranchFields = {
  BPL_IDAssignedToInvoice: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
};

/** UI `documentSeriesPayload` — NNM1.Series. */
export const sapDocumentSeriesFields = {
  Series: z.coerce.number().int().positive().optional(),
  series: z.coerce.number().int().positive().optional(),
};

/** Stamped on portal create when the user left remarks empty (IC and normal). */
export const CREATED_FROM_PORTAL_REMARK = "Created from portal";

/** SAP Document.Comments / VendorPayments.Remarks — clip to 254 so SL does not reject. */
export const toSapCommentsField = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  const clipped = String(value).trim().slice(0, SAP_FIELD_MAX.comments);
  return clipped || undefined;
};

/** Create only — empty remarks become `Created from portal`. Update still uses toSapCommentsField. */
export const toSapCreateCommentsField = (value: unknown): string =>
  toSapCommentsField(value) ?? CREATED_FROM_PORTAL_REMARK;

export const sapRequiredText = (max: number) => z.string().min(1).max(max);

export const sapOptionalCode = (max: number) => z.string().max(max).optional();
