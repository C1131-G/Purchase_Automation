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

export const NUMERIC_PROFILE = {
  currencyAmount: { fractionDigits: 2, integerDigits: 13, max: 9_999_999_999_999, min: 0 },
  digitsOnly: { integerDigits: 10 },
  discountPercent: { fractionDigits: 3, integerDigits: 3, max: 100, min: 0 },
  documentTotal: { fractionDigits: 4, integerDigits: 9, max: 999_999_999.9999, min: 0 },
  positiveIntegerQuantity: {
    fractionDigits: 0,
    integerDigits: 13,
    max: 9_999_999_999_999,
    min: 1,
  },
  positiveQuantity: {
    fractionDigits: 6,
    integerDigits: 13,
    max: 9_999_999_999_999,
    min: Number.MIN_VALUE,
  },
  sapDecimal: {
    fractionDigits: 6,
    integerDigits: 13,
    max: 9_999_999_999_999,
    min: 0,
  },
} as const;

export const VALIDATION_PATTERN = {
  digits: /^\d+$/,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  lotNumber: /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
} as const;

export const PAGINATION_LIMIT = 100;

export const isIsoCalendarDate = (value: string): boolean => {
  if (!VALIDATION_PATTERN.isoDate.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};
