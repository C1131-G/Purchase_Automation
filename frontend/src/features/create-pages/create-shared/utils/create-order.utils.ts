/**
 * Resolve line UoM for create/edit hydrate.
 * SAP often returns UoMCode "Manual" when UseBaseUnits is on; prefer real code
 * from UoMEntry match or product sales/purchase UoM (same as RFQ "Each").
 */
export const resolveLineUomCode = (params: {
  lineUomCode?: string | null | undefined;
  lineUomEntry?: number | null | undefined;
  product?: {
    uomCode?: string | null | undefined;
    purchaseUomCode?: string | null | undefined;
    uomList?: Array<{ code: string; name?: string; uomEntry?: number | undefined }> | undefined;
  } | null;
}): string => {
  const raw = String(params.lineUomCode ?? "").trim();
  const isManual = !raw || /^manual$/i.test(raw);
  if (!isManual) {
    return raw;
  }
  const entry = Number(params.lineUomEntry);
  if (Number.isFinite(entry) && entry > 0) {
    const match = params.product?.uomList?.find((uom) => uom.uomEntry === entry);
    if (match?.code) {
      return String(match.code).trim();
    }
  }
  const sales = String(params.product?.uomCode ?? "").trim();
  if (sales && !/^manual$/i.test(sales)) {
    return sales;
  }
  const purchase = String(params.product?.purchaseUomCode ?? "").trim();
  if (purchase && !/^manual$/i.test(purchase)) {
    return purchase;
  }
  return raw;
};

export const parseISODate = (value: string | undefined) => {
  if (!value) {
    return new Date();
  }

  const normalized = value.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const toISODate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** YYYY-MM-DD string compare. If `value` is after `maxIso`, return `maxIso`. */
export const capIsoDateToMax = (value: string | undefined, maxIso: string | undefined): string => {
  const next = (value ?? "").trim().slice(0, 10);
  const max = (maxIso ?? "").trim().slice(0, 10);
  if (!next || !max) {
    return next;
  }
  return next > max ? max : next;
};

export const toDisplayDate = (value: string | undefined) => {
  const date = parseISODate(value);
  return date.toLocaleDateString("en-GB");
};

const normalizeServiceLayerFieldMessage = (message: string) => {
  const compactMessage = message.replaceAll(/\s+/g, " ").trim();

  if (
    /timeout of\s+\d+(\.\d+)?ms exceeded/i.test(compactMessage) ||
    /etimedout/i.test(compactMessage) ||
    /econnaborted/i.test(compactMessage) ||
    /network error/i.test(compactMessage)
  ) {
    return "Request timed out. Please try again.";
  }

  if (/Enter due date/i.test(compactMessage) || /Specify the required date/i.test(compactMessage)) {
    if (/\[(OQUT|OPQT)\.DocDueDate\]/i.test(compactMessage)) {
      return "Valid Until is required.";
    }
    return "Delivery Date is required.";
  }

  if (/\[(ORDR|OPOR|ODPI|OPCH|ORPC|OINV|ORIN|OPDN)\.DocDueDate\]/i.test(compactMessage)) {
    return "Delivery Date is required.";
  }

  if (/\[(OQUT|OPQT)\.DocDueDate\]/i.test(compactMessage)) {
    return "Valid Until is required.";
  }

  if (/deviates from permissible range/i.test(compactMessage)) {
    return "Date deviates from permissible range. Please select a date within the active financial period.";
  }

  return compactMessage.replaceAll(/\s*\[[^[\]]+\]\s*$/g, "").trim();
};

export const normalizeCreateOrderErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message.trim()) {
    return normalizeServiceLayerFieldMessage(error.message);
  }
  return fallbackMessage;
};

export const formatWarehouseDisplay = (name: string, code: string) => {
  if (!name && !code) return "";
  if (!name) return code;
  if (!code) return name;
  return `${name.trim()} [${code.trim()}]`;
};
