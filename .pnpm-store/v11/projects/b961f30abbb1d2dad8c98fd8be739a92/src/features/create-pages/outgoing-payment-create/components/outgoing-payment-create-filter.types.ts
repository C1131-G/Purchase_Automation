import { toNumberComparisonFilter } from "@/features/table-pages/table-shared/components/filters/search/table-search.utils";
import {
  hasDateRangeValue,
  matchesDateRange,
  matchesNumberComparison,
  toDateRangeFilter,
} from "@/features/table-pages/table-shared/utils/table-filter-values";
import type {
  DateRangeFilter,
  NumberComparisonOperator,
} from "@/features/table-pages/table-shared/utils/table-filter-values";

export interface OutgoingPaymentCreateDocument {
  id: number;
  docNum: string | number;
  date: string;
  docTotal: number;
  balanceDue: number;
  totalPayment: number;
  type: "it_PurchaseInvoice" | "it_PurchCredItnote";
  label: string;
}

interface NumberComparisonDraft {
  operator: NumberComparisonOperator;
  value: string;
}

export interface OutgoingPaymentCreateFilterState {
  docType: "all" | OutgoingPaymentCreateDocument["type"];
  docNumber: string;
  docDate: DateRangeFilter;
  docTotal: NumberComparisonDraft;
  balanceDue: NumberComparisonDraft;
  totalPayment: NumberComparisonDraft;
}

export type OutgoingPaymentCreateFilterKey =
  | "docType"
  | "docNumber"
  | "docDate"
  | "docTotal"
  | "balanceDue"
  | "totalPayment";

const defaultComparisonDraft = (): NumberComparisonDraft => ({
  operator: "eq",
  value: "",
});

export const createOutgoingPaymentCreateFilterState = (): OutgoingPaymentCreateFilterState => ({
  balanceDue: defaultComparisonDraft(),
  docDate: toDateRangeFilter(),
  docNumber: "",
  docTotal: defaultComparisonDraft(),
  docType: "all",
  totalPayment: defaultComparisonDraft(),
});

export const countOutgoingPaymentCreateFilters = (filters: OutgoingPaymentCreateFilterState) => {
  let count = 0;
  if (filters.docType !== "all") {
    count += 1;
  }
  if (filters.docNumber.trim()) {
    count += 1;
  }
  if (hasDateRangeValue(filters.docDate)) {
    count += 1;
  }
  if (filters.docTotal.value.trim()) {
    count += 1;
  }
  if (filters.balanceDue.value.trim()) {
    count += 1;
  }
  if (filters.totalPayment.value.trim()) {
    count += 1;
  }
  return count;
};

export const matchesOutgoingPaymentCreateFilters = (
  document: OutgoingPaymentCreateDocument,
  filters: OutgoingPaymentCreateFilterState,
) => {
  if (filters.docType !== "all" && document.type !== filters.docType) {
    return false;
  }

  const docNumberTerm = filters.docNumber.trim().toLowerCase();
  if (docNumberTerm && !String(document.docNum).toLowerCase().includes(docNumberTerm)) {
    return false;
  }

  if (!matchesDateRange(document.date, filters.docDate)) {
    return false;
  }

  const docTotalFilter = toNumberComparisonFilter(
    filters.docTotal.operator,
    filters.docTotal.value.trim(),
  );
  if (!matchesNumberComparison(document.docTotal, docTotalFilter)) {
    return false;
  }

  const balanceDueFilter = toNumberComparisonFilter(
    filters.balanceDue.operator,
    filters.balanceDue.value.trim(),
  );
  if (!matchesNumberComparison(document.balanceDue, balanceDueFilter)) {
    return false;
  }

  const totalPaymentFilter = toNumberComparisonFilter(
    filters.totalPayment.operator,
    filters.totalPayment.value.trim(),
  );
  if (!matchesNumberComparison(document.totalPayment, totalPaymentFilter)) {
    return false;
  }

  return true;
};
