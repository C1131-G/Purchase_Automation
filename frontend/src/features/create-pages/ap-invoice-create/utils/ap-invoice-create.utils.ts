import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

export const AP_INVOICE_MANDATORY_FIELDS = ["vendorName", "vendorCode"] as const;

export type APInvoiceMandatoryField = (typeof AP_INVOICE_MANDATORY_FIELDS)[number];

/** Extended field errors that include Reference No and Remarks (matching PO pattern). */
export interface APInvoiceFieldErrors {
  vendorCode: string | undefined;
  vendorName: string | undefined;
  warehouseCode?: string | undefined;
  referenceNo?: string | undefined;
  comments?: string | undefined;
}

export const EMPTY_AP_INVOICE_FIELD_ERRORS: APInvoiceFieldErrors = {
  vendorCode: undefined,
  vendorName: undefined,
  referenceNo: undefined,
  comments: undefined,
};

export const AP_INVOICE_REFERENCE_ERROR_TEXT: Record<"referenceNo" | "comments", string> = {
  comments: "Remarks is required.",
  referenceNo: "Reference No is required.",
};

export const AP_INVOICE_FIELD_ERROR_TEXT: Record<APInvoiceMandatoryField, string> = {
  vendorCode: "Vendor Code is required.",
  vendorName: "Vendor Name is required.",
};

export const AP_INVOICE_FIELD_LABEL_TEXT: Record<APInvoiceMandatoryField, string> = {
  vendorCode: "Vendor Code",
  vendorName: "Vendor Name",
};

export const getTodayISO = () => new Date().toISOString().slice(0, 10);

export const filterAndRankLookups = <T extends LookupItem>(items: T[], term: string): T[] => {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return items;
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return items;
  }

  const score = (item: T) => {
    const code = item.code.toLowerCase();
    const foreignName = item.foreignName?.toLowerCase() ?? "";
    const name = item.name.toLowerCase();
    if (code === normalized || name === normalized || foreignName === normalized) {
      return 0;
    }
    if (
      code.startsWith(normalized) ||
      name.startsWith(normalized) ||
      foreignName.startsWith(normalized)
    ) {
      return 1;
    }
    const allWordsStart = words.every(
      (word) =>
        code.startsWith(word) ||
        foreignName.startsWith(word) ||
        name.startsWith(word) ||
        name.split(/\s+/).some((n) => n.startsWith(word)),
    );
    if (allWordsStart) {
      return 2;
    }
    const allWordsIncluded = words.every(
      (word) => code.includes(word) || foreignName.includes(word) || name.includes(word),
    );
    if (allWordsIncluded) {
      return 3;
    }
    return 4;
  };

  return [...items]
    .filter((item) => {
      const code = item.code.toLowerCase();
      const foreignName = item.foreignName?.toLowerCase() ?? "";
      const name = item.name.toLowerCase();
      return words.every(
        (word) => code.includes(word) || foreignName.includes(word) || name.includes(word),
      );
    })
    .toSorted((a, b) => {
      const byScore = score(a) - score(b);
      if (byScore !== 0) {
        return byScore;
      }
      return a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
};
