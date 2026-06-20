import { useQuery } from "@tanstack/react-query";
import type { useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { goodsReceiptQueries } from "@/features/table-pages/goods-receipt/api/goods-receipt.queries";
import type { GoodsReceiptListItem } from "@/features/table-pages/goods-receipt/api/goods-receipt.service";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";
import { useTableLookupPopupSync } from "@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync";
import { useSetActiveFilterAction } from "@/store/table/table-filter.store";

const GOODS_RECEIPT_BREADCRUMB = {
  href: "/inventory/goods-receipt",
  page: "Goods Receipt Data Table",
  section: "Inventory",
} as const;

const DOC_NUM_QUICK_LIMIT = 10;
const DOC_NUM_BACKGROUND_LIMIT = 100000;

const toOrderedUniqueDocNumSuggestions = (
  items: { code: string; name: string }[],
): LookupItem[] => {
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

export interface GoodsReceiptLookupLayerProps {
  tableId: string;
  table: ReturnType<typeof useReactTable<GoodsReceiptListItem>>;
  onReset: () => void;
}

export function GoodsReceiptLookupLayer({ tableId, table, onReset }: GoodsReceiptLookupLayerProps) {
  const setActiveFilter = useSetActiveFilterAction();

  const tableRows = table.getRowModel().rows;
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

  const docNumLookupSearchTerm = useMemo(
    () => debouncedLookupSearch.trim(),
    [debouncedLookupSearch],
  );
  const shouldQueryDocNumSearch = lookupColumnId === "DocNum" && docNumLookupSearchTerm.length >= 2;

  const docNumSuggestionsQuery = useQuery(
    goodsReceiptQueries.docNumSuggestions(undefined, DOC_NUM_QUICK_LIMIT),
  );
  const docNumSuggestionsBackgroundQuery = useQuery({
    ...goodsReceiptQueries.docNumSuggestions(undefined, DOC_NUM_BACKGROUND_LIMIT),
    enabled: docNumSuggestionsQuery.isFetched,
  });

  const tableOrderedDocNumSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>();
    const result: LookupItem[] = [];
    for (const row of tableRows) {
      const raw = row.getValue("DocNum");
      const code = raw === null || raw === undefined ? "" : String(raw).trim();
      if (!code || seen.has(code)) {
        continue;
      }
      seen.add(code);
      result.push({ code, name: code });
    }
    return result;
  }, [tableRows]);

  const docNumSuggestions = useMemo<LookupItem[]>(() => {
    const tableMatches = tableOrderedDocNumSuggestions;
    const quickMatches = toOrderedUniqueDocNumSuggestions(docNumSuggestionsQuery.data?.data ?? []);
    const backgroundMatches = toOrderedUniqueDocNumSuggestions(
      docNumSuggestionsBackgroundQuery.data?.data ?? [],
    );

    const mergedSource = [...quickMatches, ...backgroundMatches];

    // Merge background matches after table matches, ensuring uniqueness.
    const seen = new Set(tableMatches.map((m) => m.code));
    const results = [...tableMatches];

    for (const item of mergedSource) {
      if (!seen.has(item.code)) {
        seen.add(item.code);
        results.push(item);
      }
    }

    return results;
  }, [
    tableOrderedDocNumSuggestions,
    docNumSuggestionsQuery.data,
    docNumSuggestionsBackgroundQuery.data,
  ]);

  const docNumLookupSearchQuery = useQuery({
    ...goodsReceiptQueries.docNumSuggestions(
      docNumLookupSearchTerm || undefined,
      DOC_NUM_BACKGROUND_LIMIT,
    ),
    enabled: shouldQueryDocNumSearch,
  });

  const docNumLookupResults = useMemo<LookupItem[]>(() => {
    if (lookupColumnId !== "DocNum") {
      return docNumSuggestions;
    }

    const term = docNumLookupSearchTerm.toLowerCase();

    // When no search term, show staged suggestions (10 first + background up to 100)
    if (!term) {
      return docNumSuggestions;
    }

    const fromSearch = toOrderedUniqueDocNumSuggestions(docNumLookupSearchQuery.data?.data ?? []);
    const base = fromSearch.length > 0 ? fromSearch : docNumSuggestions;
    return base.filter((item) => item.code.toLowerCase().includes(term));
  }, [lookupColumnId, docNumLookupSearchQuery.data, docNumSuggestions, docNumLookupSearchTerm]);

  return (
    <>
      <TableToolbar
        tableId={tableId}
        table={table}
        onReset={onReset}
        breadcrumb={GOODS_RECEIPT_BREADCRUMB}
        createLink="/inventory/goods-receipt/create"
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
        search={lookupSearch}
        results={docNumLookupResults}
        loading={
          docNumSuggestionsQuery.isFetching ||
          docNumSuggestionsBackgroundQuery.isFetching ||
          docNumLookupSearchQuery.isFetching
        }
        error={
          (docNumSuggestionsQuery.isError ||
            docNumSuggestionsBackgroundQuery.isError ||
            docNumLookupSearchQuery.isError) &&
          docNumLookupResults.length === 0
            ? "Failed to load document numbers"
            : null
        }
        onRetry={() => {
          void docNumSuggestionsQuery.refetch();
          void docNumSuggestionsBackgroundQuery.refetch();
          if (shouldQueryDocNumSearch) {
            void docNumLookupSearchQuery.refetch();
          }
        }}
        title="Search Doc Number"
        searchPlaceholder="Search document number"
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  );
}
