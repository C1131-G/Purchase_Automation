import { useQuery } from "@tanstack/react-query";
import type { useReactTable } from "@tanstack/react-table";
import { useMemo, useCallback } from "react";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { transferQueries } from "@/features/table-pages/transfer/api/transfer.queries";
import type { TransferListItem } from "@/features/table-pages/transfer/api/transfer.service";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";
import { useTableLookupPopupSync } from "@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync";
import { useSetActiveFilterAction } from "@/store/table/table-filter.store";

const TRANSFER_BREADCRUMB = {
  href: "/inventory/transfer",
  page: "Inventory Transfer Data Table",
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

const transferFilterValueResolver = (item: LookupItem): string => {
  return item.code;
};

export interface TransferLookupLayerProps {
  tableId: string;
  table: ReturnType<typeof useReactTable<TransferListItem>>;
  onReset: () => void;
}

export function TransferLookupLayer({ tableId, table, onReset }: TransferLookupLayerProps) {
  const setActiveFilter = useSetActiveFilterAction();

  const warehousesQuery = useQuery(createSharedQueries.warehouses());
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data]);

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
    allowedColumnIds: ["DocNum", "Filler", "ToWhsCode"],
    filterValueResolver: transferFilterValueResolver,
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  });

  const docNumLookupSearchTerm = useMemo(
    () => debouncedLookupSearch.trim(),
    [debouncedLookupSearch],
  );
  const shouldQueryDocNumSearch = lookupColumnId === "DocNum" && docNumLookupSearchTerm.length >= 2;

  const docNumSuggestionsQuery = useQuery(
    transferQueries.docNumSuggestions(undefined, DOC_NUM_QUICK_LIMIT),
  );
  const docNumSuggestionsBackgroundQuery = useQuery({
    ...transferQueries.docNumSuggestions(undefined, DOC_NUM_BACKGROUND_LIMIT),
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
    ...transferQueries.docNumSuggestions(
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

  const popupTitle = useMemo(() => {
    if (lookupColumnId === "DocNum") {
      return "Search Doc Number";
    }
    if (lookupColumnId === "Filler") {
      return "Search From Warehouse";
    }
    if (lookupColumnId === "ToWhsCode") {
      return "Search To Warehouse";
    }
    return "Select Warehouse";
  }, [lookupColumnId]);

  const popupPlaceholder = useMemo(() => {
    if (lookupColumnId === "DocNum") {
      return "Search document number...";
    }
    return "Search warehouse code or name...";
  }, [lookupColumnId]);

  const popupResults = useMemo(() => {
    if (lookupColumnId === "DocNum") {
      return docNumLookupResults;
    }
    return warehouses;
  }, [lookupColumnId, docNumLookupResults, warehouses]);

  const popupLoading = useMemo(() => {
    if (lookupColumnId === "DocNum") {
      return (
        docNumSuggestionsQuery.isFetching ||
        docNumSuggestionsBackgroundQuery.isFetching ||
        docNumLookupSearchQuery.isFetching
      );
    }
    return warehousesQuery.isFetching;
  }, [
    lookupColumnId,
    docNumSuggestionsQuery.isFetching,
    docNumSuggestionsBackgroundQuery.isFetching,
    docNumLookupSearchQuery.isFetching,
    warehousesQuery.isFetching,
  ]);

  const popupError = useMemo(() => {
    if (lookupColumnId === "DocNum") {
      const hasError =
        docNumSuggestionsQuery.isError ||
        docNumSuggestionsBackgroundQuery.isError ||
        docNumLookupSearchQuery.isError;
      return hasError && docNumLookupResults.length === 0
        ? "Failed to load document numbers"
        : null;
    }
    return warehousesQuery.isError ? "Failed to load warehouses" : null;
  }, [
    lookupColumnId,
    docNumSuggestionsQuery.isError,
    docNumSuggestionsBackgroundQuery.isError,
    docNumLookupSearchQuery.isError,
    docNumLookupResults.length,
    warehousesQuery.isError,
  ]);

  const popupRetry = useCallback(() => {
    if (lookupColumnId === "DocNum") {
      void docNumSuggestionsQuery.refetch();
      void docNumSuggestionsBackgroundQuery.refetch();
      if (shouldQueryDocNumSearch) {
        void docNumLookupSearchQuery.refetch();
      }
    } else {
      void warehousesQuery.refetch();
    }
  }, [
    lookupColumnId,
    shouldQueryDocNumSearch,
    docNumSuggestionsQuery,
    docNumSuggestionsBackgroundQuery,
    docNumLookupSearchQuery,
    warehousesQuery,
  ]);

  const codeLabel = lookupColumnId === "DocNum" ? "Doc Number" : "Code";
  const nameLabel = lookupColumnId === "DocNum" ? "Details" : "Name";

  return (
    <>
      <TableToolbar
        tableId={tableId}
        table={table}
        onReset={onReset}
        breadcrumb={TRANSFER_BREADCRUMB}
        createLink="/inventory/transfer/create"
        lookupSuggestions={warehouses}
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
        mode={lookupColumnId === "DocNum" ? undefined : "warehouse"}
        showCodeOnly={lookupColumnId === "DocNum"}
        search={lookupSearch}
        results={popupResults}
        loading={popupLoading}
        error={popupError}
        onRetry={popupRetry}
        title={popupTitle}
        searchPlaceholder={popupPlaceholder}
        codeLabel={codeLabel}
        nameLabel={nameLabel}
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  );
}
