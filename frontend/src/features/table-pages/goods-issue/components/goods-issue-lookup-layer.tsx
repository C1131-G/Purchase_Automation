import { useQuery } from "@tanstack/react-query";
import type { useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { goodsIssueQueries } from "@/features/table-pages/goods-issue/api/goods-issue.queries";
import type { GoodsIssueListItem } from "@/features/table-pages/goods-issue/api/goods-issue.service";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";
import { useTableLookupPopupSync } from "@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync";
import { useSetActiveFilterAction } from "@/store/table/table-filter.store";

const GOODS_ISSUE_BREADCRUMB = {
  href: "/inventory/goods-issue",
  page: "Goods Issue Data Table",
  section: "Inventory",
} as const;

const DOC_NUM_QUICK_LIMIT = 10;
const DOC_NUM_BACKGROUND_LIMIT = 100000;

const toOrderedUniqueDocNumSuggestions = (items: LookupItem[]): LookupItem[] => {
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

export interface GoodsIssueLookupLayerProps {
  tableId: string;
  table: ReturnType<typeof useReactTable<GoodsIssueListItem>>;
  onReset: () => void;
}

export function GoodsIssueLookupLayer({ tableId, table, onReset }: GoodsIssueLookupLayerProps) {
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
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  });

  const docNumLookupSearchTerm = useMemo(
    () => debouncedLookupSearch.trim(),
    [debouncedLookupSearch],
  );
  const shouldQueryDocNumSearch = lookupColumnId === "DocNum" && docNumLookupSearchTerm.length >= 2;

  const docNumSuggestionsQuery = useQuery(
    goodsIssueQueries.docNumSuggestions(undefined, DOC_NUM_QUICK_LIMIT),
  );
  const docNumSuggestionsBackgroundQuery = useQuery({
    ...goodsIssueQueries.docNumSuggestions(undefined, DOC_NUM_BACKGROUND_LIMIT),
    enabled: docNumSuggestionsQuery.isFetched,
  });

  const tableRows = table.getRowModel().rows;
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
    ...goodsIssueQueries.docNumSuggestions(
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
        createLink="/inventory/goods-issue/create"
        breadcrumb={GOODS_ISSUE_BREADCRUMB}
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
        codeLabel="Doc Number"
        nameLabel="Details"
        showCodeOnly={true}
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  );
}
