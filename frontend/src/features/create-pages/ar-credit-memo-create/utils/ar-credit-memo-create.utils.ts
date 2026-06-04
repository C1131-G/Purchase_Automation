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

export const QUICK_PRODUCT_LIMIT = 50;
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
  if (!searchTerm) {
    return products;
  }
  const term = searchTerm.toLowerCase();
  return [...products].toSorted((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    const aCodeLower = a.code.toLowerCase();
    const bCodeLower = b.code.toLowerCase();

    if (aLower === term || aCodeLower === term) {
      return -1;
    }
    if (bLower === term || bCodeLower === term) {
      return 1;
    }

    const aStartsWith = aLower.startsWith(term) || aCodeLower.startsWith(term);
    const bStartsWith = bLower.startsWith(term) || bCodeLower.startsWith(term);
    if (aStartsWith && !bStartsWith) {
      return -1;
    }
    if (bStartsWith && !aStartsWith) {
      return 1;
    }

    return 0;
  });
}
