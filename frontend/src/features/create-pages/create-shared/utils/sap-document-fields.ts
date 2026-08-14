/**
 * SAP Business One marketing-document and payment field limits
 * (DI API / HANA table lengths). Typed values longer than these
 * are rejected by Service Layer.
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
  salesEmployeeName: 155,
  transferReference: 27,
  uomCode: 20,
  vatGroup: 8,
  warehouseCode: 8,
} as const;

/** Alphanumeric only — DistNumber / InternalSerialNumber (project + SAP lot IDs). */
export const SAP_LOT_NUMBER_PATTERN = /^[A-Za-z0-9]+$/;

/** Cheque CheckNumber is an integer in PaymentChecks. */
export const SAP_CHECK_NUMBER_PATTERN = /^\d+$/;

export const clipSapText = (value: string, max: number): string =>
  value.length <= max ? value : value.slice(0, max);

/** Header Remarks → SAP Document.Comments / VendorPayments.Remarks (omit empty). */
export const toSapCommentsPayload = (value: string | null | undefined): string | undefined => {
  const clipped = clipSapText((value ?? "").trim(), SAP_FIELD_MAX.comments);
  return clipped || undefined;
};

/** Spread into a marketing-doc payload so empty remarks omit the key (EOPT). */
export const sapCommentsField = (
  value: string | null | undefined,
): { Comments: string } | Record<string, never> => {
  const comments = toSapCommentsPayload(value);
  return comments === undefined ? {} : { Comments: comments };
};

/** Spread into a VendorPayments payload so empty remarks omit the key (EOPT). */
export const sapRemarksField = (
  value: string | null | undefined,
): { Remarks: string } | Record<string, never> => {
  const remarks = toSapCommentsPayload(value);
  return remarks === undefined ? {} : { Remarks: remarks };
};

export const sapTextOverflowError = (label: string, max: number): string =>
  `${label} cannot exceed ${max} characters (SAP limit).`;

export const sapDocumentTextErrors = (fields: {
  address?: string | undefined;
  cardCode?: string | undefined;
  cardName?: string | undefined;
  comments?: string | undefined;
  numAtCard?: string | undefined;
  warehouseCode?: string | undefined;
}): Partial<Record<keyof typeof fields, string>> => {
  const errors: Partial<Record<keyof typeof fields, string>> = {};
  if (fields.cardCode && fields.cardCode.length > SAP_FIELD_MAX.cardCode) {
    errors.cardCode = sapTextOverflowError("BP code", SAP_FIELD_MAX.cardCode);
  }
  if (fields.cardName && fields.cardName.length > SAP_FIELD_MAX.cardName) {
    errors.cardName = sapTextOverflowError("BP name", SAP_FIELD_MAX.cardName);
  }
  if (fields.numAtCard && fields.numAtCard.length > SAP_FIELD_MAX.numAtCard) {
    errors.numAtCard = sapTextOverflowError("Reference no", SAP_FIELD_MAX.numAtCard);
  }
  if (fields.comments && fields.comments.length > SAP_FIELD_MAX.comments) {
    errors.comments = sapTextOverflowError("Remarks", SAP_FIELD_MAX.comments);
  }
  if (fields.address && fields.address.length > SAP_FIELD_MAX.address) {
    errors.address = sapTextOverflowError("Address", SAP_FIELD_MAX.address);
  }
  if (fields.warehouseCode && fields.warehouseCode.length > SAP_FIELD_MAX.warehouseCode) {
    errors.warehouseCode = sapTextOverflowError("Warehouse", SAP_FIELD_MAX.warehouseCode);
  }
  return errors;
};
