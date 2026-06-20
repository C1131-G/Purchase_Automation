import { useQuery } from "@tanstack/react-query";
import type { useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import { itemMasterQueries } from "@/features/table-pages/item-master/api/item-master.queries";
import type { ItemMasterListItem } from "@/features/table-pages/item-master/api/item-master.service";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";
import { useTableLookupPopupSync } from "@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync";
import { useSetActiveFilterAction, useTableActiveFilter } from "@/store/table/table-filter.store";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

const ITEM_MASTER_BREADCRUMB = {
  href: "/inventory/item-master",
  page: "Item Master Data Table",
  section: "Inventory",
} as const;

const mergeSuggestions = (
  tableSuggestions: LookupItem[],
  quickSuggestions: LookupItem[],
  backgroundSuggestions: LookupItem[],
): LookupItem[] => {
  const seen = new Set(tableSuggestions.map((m) => m.code));
  const results = [...tableSuggestions];

  const mergedSource = [...quickSuggestions, ...backgroundSuggestions];
  for (const item of mergedSource) {
    if (!seen.has(item.code)) {
      seen.add(item.code);
      results.push(item);
    }
  }
  return results;
};

const itemMasterFilterValueResolver = (item: LookupItem, columnId: string): string => {
  if (columnId === "ItemName") {
    return item.name;
  }
  return item.code;
};

export interface ItemMasterLookupLayerProps {
  tableId: string;
  table: ReturnType<typeof useReactTable<ItemMasterListItem>>;
  onReset: () => void;
}

export function ItemMasterLookupLayer({ tableId, table, onReset }: ItemMasterLookupLayerProps) {
  const setActiveFilter = useSetActiveFilterAction();
  const activeFilterId = useTableActiveFilter(tableId);

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
    allowedColumnIds: ["ItemCode", "ItemName", "ItmsGrpCod", "InvntryUom", "CodeBars"],
    filterValueResolver: itemMasterFilterValueResolver,
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  });

  const activeSearchTerm = useMemo(() => debouncedLookupSearch.trim(), [debouncedLookupSearch]);

  // Table-ordered suggestions
  const tableItemCodeSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>();
    const result: LookupItem[] = [];
    for (const row of tableRows) {
      const code = String(row.getValue("ItemCode") ?? "").trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      const name = String(row.getValue("ItemName") ?? "").trim();
      result.push({ code, name });
    }
    return result;
  }, [tableRows]);

  const tableItemNameSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>();
    const result: LookupItem[] = [];
    for (const row of tableRows) {
      const name = String(row.getValue("ItemName") ?? "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const code = String(row.getValue("ItemCode") ?? "").trim();
      result.push({ code, name });
    }
    return result;
  }, [tableRows]);

  const tableItemGroupSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>();
    const result: LookupItem[] = [];
    for (const row of tableRows) {
      const grp = row.getValue("ItmsGrpCod");
      if (grp === null || grp === undefined || Number(grp) <= 0) continue;
      const code = String(grp).trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      result.push({ code, name: code });
    }
    return result;
  }, [tableRows]);

  const tableItemUOMSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>();
    const result: LookupItem[] = [];
    for (const row of tableRows) {
      const uom = row.getValue("InvntryUom");
      if (uom === null || uom === undefined) continue;
      const code = String(uom).trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      result.push({ code, name: code });
    }
    return result;
  }, [tableRows]);

  const tableItemBarCodeSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>();
    const result: LookupItem[] = [];
    for (const row of tableRows) {
      const barcode = row.getValue("CodeBars");
      if (barcode === null || barcode === undefined) continue;
      const code = String(barcode).trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      result.push({ code, name: code });
    }
    return result;
  }, [tableRows]);

  // ItemCode Queries
  const itemCodeQuickQuery = useQuery(itemMasterQueries.itemCodeSuggestions(undefined, 10));
  const itemCodeBackgroundQuery = useQuery({
    ...itemMasterQueries.itemCodeSuggestions(undefined, 100000),
    enabled: itemCodeQuickQuery.isFetched,
  });
  const itemCodeSearchQuery = useQuery({
    ...itemMasterQueries.itemCodeSuggestions(activeSearchTerm || undefined, 100000),
    enabled: lookupColumnId === "ItemCode" && activeSearchTerm.length >= 2,
  });

  // ItemName Queries
  const itemNameQuickQuery = useQuery(itemMasterQueries.itemNameSuggestions(undefined, 10));
  const itemNameBackgroundQuery = useQuery({
    ...itemMasterQueries.itemNameSuggestions(undefined, 100000),
    enabled: itemNameQuickQuery.isFetched,
  });
  const itemNameSearchQuery = useQuery({
    ...itemMasterQueries.itemNameSuggestions(activeSearchTerm || undefined, 100000),
    enabled: lookupColumnId === "ItemName" && activeSearchTerm.length >= 2,
  });

  // ItmsGrpCod Queries
  const itemGroupQuickQuery = useQuery(itemMasterQueries.itemGroupSuggestions(undefined, 10));
  const itemGroupBackgroundQuery = useQuery({
    ...itemMasterQueries.itemGroupSuggestions(undefined, 100000),
    enabled: itemGroupQuickQuery.isFetched,
  });
  const itemGroupSearchQuery = useQuery({
    ...itemMasterQueries.itemGroupSuggestions(activeSearchTerm || undefined, 100000),
    enabled: lookupColumnId === "ItmsGrpCod" && activeSearchTerm.length >= 1,
  });

  // InvntryUom Queries
  const itemUOMQuickQuery = useQuery(itemMasterQueries.itemUOMSuggestions(undefined, 10));
  const itemUOMBackgroundQuery = useQuery({
    ...itemMasterQueries.itemUOMSuggestions(undefined, 100000),
    enabled: itemUOMQuickQuery.isFetched,
  });
  const itemUOMSearchQuery = useQuery({
    ...itemMasterQueries.itemUOMSuggestions(activeSearchTerm || undefined, 100000),
    enabled: lookupColumnId === "InvntryUom" && activeSearchTerm.length >= 1,
  });

  // CodeBars Queries
  const itemBarCodeQuickQuery = useQuery(itemMasterQueries.itemBarCodeSuggestions(undefined, 10));
  const itemBarCodeBackgroundQuery = useQuery({
    ...itemMasterQueries.itemBarCodeSuggestions(undefined, 100000),
    enabled: itemBarCodeQuickQuery.isFetched,
  });
  const itemBarCodeSearchQuery = useQuery({
    ...itemMasterQueries.itemBarCodeSuggestions(activeSearchTerm || undefined, 100000),
    enabled: lookupColumnId === "CodeBars" && activeSearchTerm.length >= 2,
  });

  // Merge staged suggestions
  const baseItemCodeSuggestions = useMemo(() => {
    return mergeSuggestions(
      tableItemCodeSuggestions,
      itemCodeQuickQuery.data?.data ?? [],
      itemCodeBackgroundQuery.data?.data ?? [],
    );
  }, [tableItemCodeSuggestions, itemCodeQuickQuery.data, itemCodeBackgroundQuery.data]);

  const baseItemNameSuggestions = useMemo(() => {
    return mergeSuggestions(
      tableItemNameSuggestions,
      itemNameQuickQuery.data?.data ?? [],
      itemNameBackgroundQuery.data?.data ?? [],
    );
  }, [tableItemNameSuggestions, itemNameQuickQuery.data, itemNameBackgroundQuery.data]);

  const baseItemGroupSuggestions = useMemo(() => {
    return mergeSuggestions(
      tableItemGroupSuggestions,
      itemGroupQuickQuery.data?.data ?? [],
      itemGroupBackgroundQuery.data?.data ?? [],
    );
  }, [tableItemGroupSuggestions, itemGroupQuickQuery.data, itemGroupBackgroundQuery.data]);

  const baseItemUOMSuggestions = useMemo(() => {
    return mergeSuggestions(
      tableItemUOMSuggestions,
      itemUOMQuickQuery.data?.data ?? [],
      itemUOMBackgroundQuery.data?.data ?? [],
    );
  }, [tableItemUOMSuggestions, itemUOMQuickQuery.data, itemUOMBackgroundQuery.data]);

  const baseItemBarCodeSuggestions = useMemo(() => {
    return mergeSuggestions(
      tableItemBarCodeSuggestions,
      itemBarCodeQuickQuery.data?.data ?? [],
      itemBarCodeBackgroundQuery.data?.data ?? [],
    );
  }, [tableItemBarCodeSuggestions, itemBarCodeQuickQuery.data, itemBarCodeBackgroundQuery.data]);

  // Determine active suggestions based on active filter or current lookup
  const activeSuggestions = useMemo(() => {
    const colId = activeFilterId || lookupColumnId;
    if (colId === "ItemCode") {
      return baseItemCodeSuggestions;
    }
    if (colId === "ItemName") {
      return baseItemNameSuggestions;
    }
    if (colId === "ItmsGrpCod") {
      return baseItemGroupSuggestions;
    }
    if (colId === "InvntryUom") {
      return baseItemUOMSuggestions;
    }
    if (colId === "CodeBars") {
      return baseItemBarCodeSuggestions;
    }
    return [];
  }, [
    activeFilterId,
    lookupColumnId,
    baseItemCodeSuggestions,
    baseItemNameSuggestions,
    baseItemGroupSuggestions,
    baseItemUOMSuggestions,
    baseItemBarCodeSuggestions,
  ]);

  // Determine lookup results for popup
  const lookupResults = useMemo(() => {
    const term = activeSearchTerm.toLowerCase();
    if (lookupColumnId === "ItemCode") {
      if (!term) return baseItemCodeSuggestions;
      const searchData = itemCodeSearchQuery.data?.data ?? [];
      const base = searchData.length > 0 ? searchData : baseItemCodeSuggestions;
      return base.filter(
        (item) => item.code.toLowerCase().includes(term) || item.name.toLowerCase().includes(term),
      );
    }
    if (lookupColumnId === "ItemName") {
      if (!term) return baseItemNameSuggestions;
      const searchData = itemNameSearchQuery.data?.data ?? [];
      const base = searchData.length > 0 ? searchData : baseItemNameSuggestions;
      return base.filter(
        (item) => item.code.toLowerCase().includes(term) || item.name.toLowerCase().includes(term),
      );
    }
    if (lookupColumnId === "ItmsGrpCod") {
      if (!term) return baseItemGroupSuggestions;
      const searchData = itemGroupSearchQuery.data?.data ?? [];
      const base = searchData.length > 0 ? searchData : baseItemGroupSuggestions;
      return base.filter(
        (item) => item.code.includes(term) || item.name.toLowerCase().includes(term),
      );
    }
    if (lookupColumnId === "InvntryUom") {
      if (!term) return baseItemUOMSuggestions;
      const searchData = itemUOMSearchQuery.data?.data ?? [];
      const base = searchData.length > 0 ? searchData : baseItemUOMSuggestions;
      return base.filter((item) => item.code.toLowerCase().includes(term));
    }
    if (lookupColumnId === "CodeBars") {
      if (!term) return baseItemBarCodeSuggestions;
      const searchData = itemBarCodeSearchQuery.data?.data ?? [];
      const base = searchData.length > 0 ? searchData : baseItemBarCodeSuggestions;
      return base.filter((item) => item.code.toLowerCase().includes(term));
    }
    return [];
  }, [
    lookupColumnId,
    activeSearchTerm,
    baseItemCodeSuggestions,
    itemCodeSearchQuery.data,
    baseItemNameSuggestions,
    itemNameSearchQuery.data,
    baseItemGroupSuggestions,
    itemGroupSearchQuery.data,
    baseItemUOMSuggestions,
    itemUOMSearchQuery.data,
    baseItemBarCodeSuggestions,
    itemBarCodeSearchQuery.data,
  ]);

  const lookupLoading = useMemo(() => {
    if (lookupColumnId === "ItemCode") {
      return (
        itemCodeQuickQuery.isFetching ||
        itemCodeBackgroundQuery.isFetching ||
        itemCodeSearchQuery.isFetching
      );
    }
    if (lookupColumnId === "ItemName") {
      return (
        itemNameQuickQuery.isFetching ||
        itemNameBackgroundQuery.isFetching ||
        itemNameSearchQuery.isFetching
      );
    }
    if (lookupColumnId === "ItmsGrpCod") {
      return (
        itemGroupQuickQuery.isFetching ||
        itemGroupBackgroundQuery.isFetching ||
        itemGroupSearchQuery.isFetching
      );
    }
    if (lookupColumnId === "InvntryUom") {
      return (
        itemUOMQuickQuery.isFetching ||
        itemUOMBackgroundQuery.isFetching ||
        itemUOMSearchQuery.isFetching
      );
    }
    if (lookupColumnId === "CodeBars") {
      return (
        itemBarCodeQuickQuery.isFetching ||
        itemBarCodeBackgroundQuery.isFetching ||
        itemBarCodeSearchQuery.isFetching
      );
    }
    return false;
  }, [
    lookupColumnId,
    itemCodeQuickQuery.isFetching,
    itemCodeBackgroundQuery.isFetching,
    itemCodeSearchQuery.isFetching,
    itemNameQuickQuery.isFetching,
    itemNameBackgroundQuery.isFetching,
    itemNameSearchQuery.isFetching,
    itemGroupQuickQuery.isFetching,
    itemGroupBackgroundQuery.isFetching,
    itemGroupSearchQuery.isFetching,
    itemUOMQuickQuery.isFetching,
    itemUOMBackgroundQuery.isFetching,
    itemUOMSearchQuery.isFetching,
    itemBarCodeQuickQuery.isFetching,
    itemBarCodeBackgroundQuery.isFetching,
    itemBarCodeSearchQuery.isFetching,
  ]);

  const lookupError = useMemo(() => {
    if (lookupColumnId === "ItemCode") {
      return itemCodeQuickQuery.isError ||
        itemCodeBackgroundQuery.isError ||
        itemCodeSearchQuery.isError
        ? "Failed to load item codes"
        : null;
    }
    if (lookupColumnId === "ItemName") {
      return itemNameQuickQuery.isError ||
        itemNameBackgroundQuery.isError ||
        itemNameSearchQuery.isError
        ? "Failed to load item descriptions"
        : null;
    }
    if (lookupColumnId === "ItmsGrpCod") {
      return itemGroupQuickQuery.isError ||
        itemGroupBackgroundQuery.isError ||
        itemGroupSearchQuery.isError
        ? "Failed to load item groups"
        : null;
    }
    if (lookupColumnId === "InvntryUom") {
      return itemUOMQuickQuery.isError ||
        itemUOMBackgroundQuery.isError ||
        itemUOMSearchQuery.isError
        ? "Failed to load units of measure"
        : null;
    }
    if (lookupColumnId === "CodeBars") {
      return itemBarCodeQuickQuery.isError ||
        itemBarCodeBackgroundQuery.isError ||
        itemBarCodeSearchQuery.isError
        ? "Failed to load bar codes"
        : null;
    }
    return null;
  }, [
    lookupColumnId,
    itemCodeQuickQuery.isError,
    itemCodeBackgroundQuery.isError,
    itemCodeSearchQuery.isError,
    itemNameQuickQuery.isError,
    itemNameBackgroundQuery.isError,
    itemNameSearchQuery.isError,
    itemGroupQuickQuery.isError,
    itemGroupBackgroundQuery.isError,
    itemGroupSearchQuery.isError,
    itemUOMQuickQuery.isError,
    itemUOMBackgroundQuery.isError,
    itemUOMSearchQuery.isError,
    itemBarCodeQuickQuery.isError,
    itemBarCodeBackgroundQuery.isError,
    itemBarCodeSearchQuery.isError,
  ]);

  return (
    <>
      <TableToolbar
        tableId={tableId}
        table={table}
        onReset={onReset}
        createLink="/inventory/item-master/create"
        breadcrumb={ITEM_MASTER_BREADCRUMB}
        lookupSuggestions={activeSuggestions}
        onLookupPopupIntent={handleLookupPopupIntent}
        onLookupPopupOpen={handleLookupPopupOpen}
        onLookupSelect={handleLookupSelect}
        lookupExternalSelection={externalSelection}
      />
      <LookupPopup
        open={lookupPopupOpen}
        search={lookupSearch}
        results={lookupResults}
        loading={lookupLoading}
        error={lookupError}
        onRetry={() => {
          if (lookupColumnId === "ItemCode") {
            void itemCodeQuickQuery.refetch();
            void itemCodeBackgroundQuery.refetch();
            if (activeSearchTerm.length >= 2) void itemCodeSearchQuery.refetch();
          } else if (lookupColumnId === "ItemName") {
            void itemNameQuickQuery.refetch();
            void itemNameBackgroundQuery.refetch();
            if (activeSearchTerm.length >= 2) void itemNameSearchQuery.refetch();
          } else if (lookupColumnId === "ItmsGrpCod") {
            void itemGroupQuickQuery.refetch();
            void itemGroupBackgroundQuery.refetch();
            if (activeSearchTerm.length >= 1) void itemGroupSearchQuery.refetch();
          } else if (lookupColumnId === "InvntryUom") {
            void itemUOMQuickQuery.refetch();
            void itemUOMBackgroundQuery.refetch();
            if (activeSearchTerm.length >= 1) void itemUOMSearchQuery.refetch();
          } else if (lookupColumnId === "CodeBars") {
            void itemBarCodeQuickQuery.refetch();
            void itemBarCodeBackgroundQuery.refetch();
            if (activeSearchTerm.length >= 2) void itemBarCodeSearchQuery.refetch();
          }
        }}
        title={
          lookupColumnId === "ItemCode"
            ? "Search Item No"
            : lookupColumnId === "ItemName"
              ? "Search Item Description"
              : lookupColumnId === "ItmsGrpCod"
                ? "Search Item Group"
                : lookupColumnId === "InvntryUom"
                  ? "Search Unit of Measure"
                  : "Search Bar Code"
        }
        searchPlaceholder={
          lookupColumnId === "ItemCode"
            ? "Search item no..."
            : lookupColumnId === "ItemName"
              ? "Search item description..."
              : lookupColumnId === "ItmsGrpCod"
                ? "Search item group..."
                : lookupColumnId === "InvntryUom"
                  ? "Search unit of measure..."
                  : "Search bar code..."
        }
        showCodeOnly={
          lookupColumnId === "ItemCode" ||
          lookupColumnId === "ItmsGrpCod" ||
          lookupColumnId === "InvntryUom" ||
          lookupColumnId === "CodeBars"
        }
        showNameOnly={lookupColumnId === "ItemName"}
        codeLabel={
          lookupColumnId === "InvntryUom"
            ? "UoM"
            : lookupColumnId === "CodeBars"
              ? "Bar Code"
              : lookupColumnId === "ItemCode"
                ? "Item No"
                : lookupColumnId === "ItmsGrpCod"
                  ? "Group"
                  : "Code"
        }
        nameLabel="Description"
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  );
}
