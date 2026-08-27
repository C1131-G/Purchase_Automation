import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { PURCHASE_QUOTATION_MANDATORY_FIELDS } from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import {
  addCalendarDays,
  addCalendarMonths,
} from "@/features/create-pages/create-shared/utils/create-order.utils";

export const PQ_REQUIRED_DATE_GAP_DAYS = 2;

export const getPqDefaultDates = (today: string) => {
  const requiredDate = addCalendarMonths(today, 1);
  return {
    requiredDate,
    validUntil: addCalendarDays(requiredDate, PQ_REQUIRED_DATE_GAP_DAYS),
  };
};

export const getPqRequiredDateMin = (today: string): string => addCalendarMonths(today, 1);

export const getPqRequiredDateMax = (validUntil: string): string =>
  addCalendarDays(validUntil, -PQ_REQUIRED_DATE_GAP_DAYS);

export const getPqValidUntilMin = (requiredDate: string, rowRequiredDates: string[]): string => {
  const latestRequiredDate = [requiredDate, ...rowRequiredDates]
    .map((date) => date.trim().slice(0, 10))
    .filter(Boolean)
    .toSorted()
    .at(-1);
  return latestRequiredDate ? addCalendarDays(latestRequiredDate, PQ_REQUIRED_DATE_GAP_DAYS) : "";
};

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
export const MANDATORY_ERROR_TEXT: Record<
  (typeof PURCHASE_QUOTATION_MANDATORY_FIELDS)[number],
  string
> = {
  vendorCode: "Vendor Code is required.",
  vendorName: "Vendor Name is required.",
};
export const REQUIRED_FIELD_LABEL_TEXT: Record<
  (typeof PURCHASE_QUOTATION_MANDATORY_FIELDS)[number],
  string
> = {
  vendorCode: "Vendor Code",
  vendorName: "Vendor Name",
};
/** First paint in product popup — keep small for fast open. */
export const QUICK_PRODUCT_LIMIT = 10;
/** Browse expansion after scroll / background warm (matches backend warm page). */
export const BROWSE_PRODUCT_LIMIT = 50;
/** Large hydrate for edit / bulk line resolution. */
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
    const foreignName = item.foreignName?.toLowerCase() ?? "";
    const name = item.name.toLowerCase();
    if (code === term || name === term || foreignName === term) {
      return 0;
    }
    if (code.startsWith(term) || name.startsWith(term) || foreignName.startsWith(term)) {
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
