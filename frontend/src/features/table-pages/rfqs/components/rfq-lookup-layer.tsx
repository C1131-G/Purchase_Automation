/**
 * RFQ lookup layer — same TableToolbar + LookupPopup pattern as purchase quotations.
 * No Create button (RFQs are created from IC PQ draft Flow 1).
 */
import { useQuery } from "@tanstack/react-query";
import type { useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import type { IcRfqHeader } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";
import { useTableLookupPopupSync } from "@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync";
import { useSetActiveFilterAction } from "@/store/table/table-filter.store";

const RFQ_BREADCRUMB = {
  href: "/sales/rfqs",
  page: "RFQs Data Table",
  section: "Sales",
} as const;

const DOC_NUM_BACKGROUND_LIMIT = 100;

const toOrderedUniqueDocNumSuggestions = (items: LookupItem[]): LookupItem[] => {
  const seen = new Set<string>();
  const result: LookupItem[] = [];
  for (const item of items) {
    const code = item.code.trim();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    result.push({ code, name: code });
  }
  return result;
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

  const vendorsQuery = useQuery(createSharedQueries.vendors());
  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);

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
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  });

  const docNumSuggestions = useMemo<LookupItem[]>(() => {
    const items: LookupItem[] = [];
    for (const row of allRows) {
      const code = String(row.rfqNumber ?? "").trim();
      if (!code) {
        continue;
      }
      items.push({ code, name: code });
    }
    return toOrderedUniqueDocNumSuggestions(items).slice(0, DOC_NUM_BACKGROUND_LIMIT);
  }, [allRows]);

  const docNumLookupSearchTerm = useMemo(
    () => debouncedLookupSearch.trim().toLowerCase(),
    [debouncedLookupSearch],
  );

  const docNumLookupResults = useMemo<LookupItem[]>(() => {
    if (lookupColumnId !== "DocNum") {
      return docNumSuggestions;
    }
    if (!docNumLookupSearchTerm) {
      return docNumSuggestions;
    }
    return docNumSuggestions
      .filter((item) => item.code.toLowerCase().includes(docNumLookupSearchTerm))
      .slice(0, DOC_NUM_BACKGROUND_LIMIT);
  }, [lookupColumnId, docNumSuggestions, docNumLookupSearchTerm]);

  return (
    <>
      <TableToolbar
        tableId={tableId}
        table={table}
        onReset={onReset}
        hideCreate
        breadcrumb={RFQ_BREADCRUMB}
        lookupSuggestions={vendors}
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
        mode={
          lookupColumnId === "DocNum"
            ? "vendor-code"
            : lookupColumnId === "CardCode"
              ? "vendor-code"
              : "vendor-name"
        }
        search={lookupSearch}
        results={lookupColumnId === "DocNum" ? docNumLookupResults : vendors}
        loading={lookupColumnId === "DocNum" ? false : vendorsQuery.isFetching}
        error={
          lookupColumnId === "DocNum"
            ? null
            : vendorsQuery.isError
              ? "Failed to load vendors"
              : null
        }
        onRetry={() => {
          if (lookupColumnId === "DocNum") {
            return;
          }
          void vendorsQuery.refetch();
        }}
        title={
          lookupColumnId === "DocNum"
            ? "Search Doc Number"
            : lookupColumnId === "CardCode"
              ? "Search Vendor Code"
              : "Search Vendor Name"
        }
        searchPlaceholder={
          lookupColumnId === "DocNum"
            ? "Search document number"
            : lookupColumnId === "CardCode"
              ? "Search vendor code"
              : "Search vendor name"
        }
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  );
}
