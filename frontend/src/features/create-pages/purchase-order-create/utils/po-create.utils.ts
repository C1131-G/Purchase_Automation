import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

export interface ProductSearchFieldError {
  vendorName: string | undefined;
  vendorCode: string | undefined;
  docDueDate: string | undefined;
  warehouseCode: string | undefined;
  salesEmployee: string | undefined;
  billToAddress: string | undefined;
  shipToAddress: string | undefined;
  referenceNo: string | undefined;
  comments: string | undefined;
}

export const EMPTY_PRODUCT_SEARCH_FIELD_ERRORS: ProductSearchFieldError = {
  billToAddress: undefined,
  comments: undefined,
  docDueDate: undefined,
  referenceNo: undefined,
  salesEmployee: undefined,
  shipToAddress: undefined,
  vendorCode: undefined,
  vendorName: undefined,
  warehouseCode: undefined,
};

export const MANDATORY_ERROR_TEXT: Record<"vendorCode" | "vendorName" | "warehouseCode", string> = {
  vendorCode: "Vendor Code is required.",
  vendorName: "Vendor Name is required.",
  warehouseCode: "Warehouse is required.",
};

export const REQUIRED_FIELD_LABEL_TEXT: Record<
  "vendorCode" | "vendorName" | "warehouseCode",
  string
> = {
  vendorCode: "Vendor Code",
  vendorName: "Vendor Name",
  warehouseCode: "Warehouse",
};

export const QUICK_PRODUCT_LIMIT = 10;
export const FULL_PRODUCT_LIMIT = 500;

export const rankProductsBySearchRelevance = (items: ProductLookupItem[], rawSearch: string) => {
  const term = rawSearch.trim().toLowerCase();
  if (!term) {
    return items;
  }
  const words = term.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return items;
  }

  const score = (item: ProductLookupItem) => {
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

  return [...items].toSorted((a, b) => {
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
