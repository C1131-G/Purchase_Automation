export interface ProductSearchFieldError {
  vendorName: string | undefined;
  vendorCode: string | undefined;
  warehouse: string | undefined;
  docDueDate: string | undefined;
  salesEmployee: string | undefined;
  billToAddress: string | undefined;
  shipToAddress: string | undefined;
  referenceNo: string | undefined;
  comments: string | undefined;
}

export const QUICK_PRODUCT_LIMIT = 10;
export const FULL_PRODUCT_LIMIT = 500;

export const EMPTY_PRODUCT_SEARCH_FIELD_ERRORS: ProductSearchFieldError = {
  billToAddress: undefined,
  comments: undefined,
  docDueDate: undefined,
  referenceNo: undefined,
  salesEmployee: undefined,
  shipToAddress: undefined,
  vendorCode: undefined,
  vendorName: undefined,
  warehouse: undefined,
};

export const AR_CREDIT_MEMO_MANDATORY_FIELDS = ["vendorCode", "vendorName"] as const;
export type ArCreditMemoMandatoryField = (typeof AR_CREDIT_MEMO_MANDATORY_FIELDS)[number];

export const MANDATORY_ERROR_TEXT = {
  billToAddress: "Bill To Address is required.",
  comments: "Comments are required.",
  docDueDate: "Document Due Date is required.",
  referenceNo: "Reference No is required.",
  salesEmployee: "Sales Employee is required.",
  shipToAddress: "Ship To Address is required.",
  vendorCode: "Customer Code is required.",
  vendorName: "Customer Name is required.",
  warehouseCode: "Warehouse is required.",
};

export const REQUIRED_FIELD_LABEL_TEXT: Record<string, string> = {
  billToAddress: "Bill To Address",
  comments: "Comments",
  docDueDate: "Document Due Date",
  referenceNo: "Reference No",
  salesEmployee: "Sales Employee",
  shipToAddress: "Ship To Address",
  vendorCode: "Customer Code",
  vendorName: "Customer Name",
  warehouseCode: "Warehouse",
};

export function rankProductsBySearchRelevance<T extends { code: string; name: string }>(
  products: T[],
  searchTerm: string,
): T[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) {
    return products;
  }
  const words = term.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return products;
  }

  const score = (item: T) => {
    const code = item.code.toLowerCase();
    const name = item.name.toLowerCase();
    if (code === term || name === term) {
      return 0;
    }
    if (code.startsWith(term) || name.startsWith(term)) {
      return 1;
    }
    const allWordsStart = words.every(
      (word) =>
        code.startsWith(word) ||
        name.startsWith(word) ||
        name.split(/\s+/).some((n) => n.startsWith(word)),
    );
    if (allWordsStart) {
      return 2;
    }
    const allWordsIncluded = words.every((word) => code.includes(word) || name.includes(word));
    if (allWordsIncluded) {
      return 3;
    }
    return 4;
  };

  return [...products].toSorted((a, b) => {
    const byScore = score(a) - score(b);
    if (byScore !== 0) {
      return byScore;
    }
    return a.code.localeCompare(b.code, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}
