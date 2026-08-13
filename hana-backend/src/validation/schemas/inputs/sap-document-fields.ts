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

export const sapRequiredText = (max: number) => z.string().min(1).max(max);

export const sapOptionalCode = (max: number) => z.string().max(max).optional();
