export const PURCHASE_ORDER_MANDATORY_FIELDS = [
  "vendorCode",
  "vendorName",
  "warehouseCode",
] as const;

export const SALES_ORDER_MANDATORY_FIELDS = ["vendorCode", "vendorName"] as const;

export const SALES_QUOTATION_MANDATORY_FIELDS = ["vendorCode", "vendorName"] as const;

export const AR_INVOICE_MANDATORY_FIELDS = ["vendorCode", "vendorName"] as const;

export const AP_INVOICE_MANDATORY_FIELDS = [...PURCHASE_ORDER_MANDATORY_FIELDS] as const;

type MandatoryFieldValue = string | number | boolean | null | undefined;

export const getMissingMandatoryCreateFieldsTyped = <TField extends string>(
  values: Record<TField, MandatoryFieldValue>,
  requiredFields: readonly TField[],
) =>
  requiredFields.filter((field) => {
    const value = values[field];
    if (typeof value === "number") {
      return value <= 0;
    }
    if (typeof value === "boolean") {
      return !value;
    }
    return !String(value ?? "").trim();
  });
