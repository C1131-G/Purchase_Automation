/**
 * Request For Quotation lookup layer — sales-side (customer, not vendor).
 * Doc Number, customer, and table-value fields (PQ draft, companies) use suggestion
 * chips + full-screen lookup from the loaded RFQ list.
 * No Create button (documents are created from IC PQ draft Flow 1).
 */
import type { useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import type { IcRfqHeader } from "@/features/intercompany/schemas/intercompany-api.schema";
import { formatRfqDocNumber } from "@/features/table-pages/rfqs/utils/format-rfq-doc-number";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";
import { useTableLookupPopupSync } from "@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync";
import { useSetActiveFilterAction } from "@/store/table/table-filter.store";

const REQUEST_FOR_QUOTATION_BREADCRUMB = {
  href: "/sales/request-for-quotations",
  page: "Request For Quotations Data Table",
  section: "Sales",
} as const;

const DOC_NUM_BACKGROUND_LIMIT = 100;

/** Columns that open lookup popup + suggestion chips (mirrors Doc Number UX). */
const RFQ_LOOKUP_COLUMNS = [
  "DocNum",
  "CardCode",
  "pqDraftDocNum",
  "pqDraftDocEntry",
  "sourceCompanyId",
  "targetCompanyId",
] as const;

type RfqLookupColumnId = (typeof RFQ_LOOKUP_COLUMNS)[number];

const TABLE_VALUE_COLUMNS = new Set<string>([
  "pqDraftDocNum",
  "pqDraftDocEntry",
  "sourceCompanyId",
  "targetCompanyId",
]);

const LOOKUP_TITLES: Record<RfqLookupColumnId, string> = {
  CardCode: "Search Customer Code",
  DocNum: "Search Doc Number",
  pqDraftDocEntry: "Search PQ Draft Entry",
  pqDraftDocNum: "Search PQ Draft No.",
  sourceCompanyId: "Search Source Co.",
  targetCompanyId: "Search Target Co.",
};

const LOOKUP_PLACEHOLDERS: Record<RfqLookupColumnId, string> = {
  CardCode: "Search customer code",
  DocNum: "Search document number",
  pqDraftDocEntry: "Search PQ draft entry",
  pqDraftDocNum: "Search PQ draft number",
  sourceCompanyId: "Search source company name",
  targetCompanyId: "Search target company name",
};

const toOrderedUniqueSuggestions = (items: LookupItem[]): LookupItem[] => {
  const seen = new Set<string>();
  const result: LookupItem[] = [];
  for (const item of items) {
    const code = item.code.trim();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    result.push({ code, name: item.name || code });
  }
  return result;
};

const pickFieldValue = (row: IcRfqHeader, columnId: string): string => {
  switch (columnId) {
    case "DocNum":
      return String(formatRfqDocNumber(row.rfqNumber)).trim();
    case "CardCode": {
      const code = row.customerCode?.trim();
      if (code) {
        return code;
      }
      return row.customerName?.trim() || row.sourceCompanyName?.trim() || "";
    }
    case "pqDraftDocNum":
      return row.pqDraftDocNum === null || row.pqDraftDocNum === undefined
        ? ""
        : String(row.pqDraftDocNum).trim();
    case "pqDraftDocEntry":
      return row.pqDraftDocEntry === null || row.pqDraftDocEntry === undefined
        ? ""
        : String(row.pqDraftDocEntry).trim();
    case "sourceCompanyId": {
      const name = row.sourceCompanyName?.trim();
      return name || String(row.sourceCompanyId ?? "").trim();
    }
    case "targetCompanyId": {
      const name = row.targetCompanyName?.trim();
      return name || String(row.targetCompanyId ?? "").trim();
    }
    default:
      return "";
  }
};

const buildSuggestionsFromRows = (rows: IcRfqHeader[], columnId: string): LookupItem[] => {
  const items: LookupItem[] = [];
  for (const row of rows) {
    const code = pickFieldValue(row, columnId);
    if (!code) {
      continue;
    }
    items.push({ code, name: code });
  }
  return toOrderedUniqueSuggestions(items).slice(0, DOC_NUM_BACKGROUND_LIMIT);
};

export interface RfqLookupLayerProps {
  tableId: string;
  table: ReturnType<typeof useReactTable<IcRfqHeader>>;
  onReset: () => void;
  /** Full unfiltered list for suggestion chips (not just current page). */
  allRows: IcRfqHeader[];
}

export function RfqLookupLayer({ tableId, table, onReset, allRows }: RfqLookupLayerProps) {
  const setActiveFilter = useSetActiveFilterAction();

  const {
    lookupPopupOpen,
    lookupColumnId,
    lookupSearch,
    debouncedLookupSearch,
    externalSelection,
    onLookupPopupIntent: handleLookupPopupIntent,
    onLookupPopupOpen: handleLookupPopupOpen,
    onLookupSearchChange: handleLookupSearchChange,
    onLookupPopupClose: handleLookupPopupClose,
    onLookupSelect: handleLookupSelect,
  } = useTableLookupPopupSync({
    table,
    tableId,
    allowedColumnIds: [...RFQ_LOOKUP_COLUMNS],
    filterValueResolver: (item) => item.code,
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  });

  // All lookup values come from the already-loaded RFQ list — no extra master-data fetch on mount.
  const docNumSuggestions = useMemo(() => buildSuggestionsFromRows(allRows, "DocNum"), [allRows]);
  const customerSuggestions = useMemo(
    () => buildSuggestionsFromRows(allRows, "CardCode"),
    [allRows],
  );

  const lookupSearchTerm = useMemo(
    () => debouncedLookupSearch.trim().toLowerCase(),
    [debouncedLookupSearch],
  );

  const isTableValueLookup = TABLE_VALUE_COLUMNS.has(lookupColumnId);
  const isDocNumLookup = lookupColumnId === "DocNum";
  const isCustomerLookup = lookupColumnId === "CardCode";

  const tableColumnSuggestions = useMemo(() => {
    if (!isTableValueLookup && !isDocNumLookup && !isCustomerLookup) {
      return [] as LookupItem[];
    }
    return buildSuggestionsFromRows(allRows, lookupColumnId || "DocNum");
  }, [allRows, isCustomerLookup, isDocNumLookup, isTableValueLookup, lookupColumnId]);

  const filteredTableLookupResults = useMemo(() => {
    if (!lookupSearchTerm) {
      return tableColumnSuggestions;
    }
    return tableColumnSuggestions
      .filter((item) => item.code.toLowerCase().includes(lookupSearchTerm))
      .slice(0, DOC_NUM_BACKGROUND_LIMIT);
  }, [lookupSearchTerm, tableColumnSuggestions]);

  const popupResults = filteredTableLookupResults;

  const popupTitle =
    lookupColumnId && lookupColumnId in LOOKUP_TITLES
      ? LOOKUP_TITLES[lookupColumnId as RfqLookupColumnId]
      : "Search";

  const popupPlaceholder =
    lookupColumnId && lookupColumnId in LOOKUP_PLACEHOLDERS
      ? LOOKUP_PLACEHOLDERS[lookupColumnId as RfqLookupColumnId]
      : "Search…";

  return (
    <>
      <TableToolbar
        tableId={tableId}
        table={table}
        onReset={onReset}
        hideCreate
        breadcrumb={REQUEST_FOR_QUOTATION_BREADCRUMB}
        lookupSuggestions={customerSuggestions}
        docNumSuggestions={docNumSuggestions}
        enableDocNumPopup
        preserveDocNumSuggestionOrder
        onLookupPopupIntent={handleLookupPopupIntent}
        onLookupPopupOpen={handleLookupPopupOpen}
        onLookupSelect={handleLookupSelect}
        lookupExternalSelection={externalSelection}
      />
      <LookupPopup
        open={lookupPopupOpen}
        mode="vendor-code"
        showCodeOnly
        search={lookupSearch}
        results={popupResults}
        loading={false}
        error={null}
        onRetry={() => undefined}
        title={popupTitle}
        searchPlaceholder={popupPlaceholder}
        codeLabel={
          isDocNumLookup
            ? "Doc Number"
            : isCustomerLookup
              ? "Customer Code"
              : isTableValueLookup
                ? popupTitle.replace(/^Search\s+/i, "")
                : "Code"
        }
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  );
}
