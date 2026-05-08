import type { Table } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";

import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

interface UseTableLookupPopupSyncParams<TData> {
  table: Table<TData>;
  tableId: string;
  onSetActiveFilter?: (tableId: string, columnId: string) => void;
  allowedColumnIds?: string[];
}

interface UseTableLookupPopupSyncResult {
  lookupPopupOpen: boolean;
  lookupColumnId: string;
  lookupSearch: string;
  debouncedLookupSearch: string;
  externalSelection: { item: LookupItem; columnId: string } | null;
  onLookupPopupIntent: (columnId: string, initialSearch?: string) => void;
  onLookupPopupOpen: (columnId: string, initialSearch?: string) => void;
  onLookupSearchChange: (value: string) => void;
  onLookupPopupClose: () => void;
  onLookupSelect: (item: LookupItem, columnId: string) => void;
}

const DEFAULT_LOOKUP_COLUMNS = ["CardCode", "CardName", "DocNum"];

export function useTableLookupPopupSync<TData>({
  table,
  tableId,
  onSetActiveFilter,
  allowedColumnIds = DEFAULT_LOOKUP_COLUMNS,
}: UseTableLookupPopupSyncParams<TData>): UseTableLookupPopupSyncResult {
  const [lookupPopupOpen, setLookupPopupOpen] = useState(false);
  const [lookupColumnId, setLookupColumnId] = useState("");
  const [lookupSearch, setLookupSearch] = useState("");
  const [debouncedLookupSearch, setDebouncedLookupSearch] = useState("");
  const [externalSelection, setExternalSelection] = useState<{
    item: LookupItem;
    columnId: string;
  } | null>(null);

  const seedLookupPopupState = useCallback(
    (columnId: string, initialSearch?: string) => {
      if (!allowedColumnIds.includes(columnId)) {
        return;
      }

      const column = table.getColumn(columnId);
      const filterValue = column?.getFilterValue();
      const trimmedInitial = initialSearch?.trim() ?? "";
      const searchVal =
        trimmedInitial.length > 0
          ? trimmedInitial
          : filterValue === null || filterValue === undefined
            ? ""
            : String(filterValue).trim();

      setLookupColumnId(columnId);
      setLookupSearch(searchVal);
      setDebouncedLookupSearch(searchVal);
      setExternalSelection(null);
    },
    [allowedColumnIds, table],
  );

  const onLookupPopupIntent = useCallback(
    (columnId: string, initialSearch?: string) => {
      seedLookupPopupState(columnId, initialSearch);
    },
    [seedLookupPopupState],
  );

  const onLookupPopupOpen = useCallback(
    (columnId: string, initialSearch?: string) => {
      seedLookupPopupState(columnId, initialSearch);
      setLookupPopupOpen(true);
    },
    [seedLookupPopupState],
  );

  const onLookupSearchChange = useCallback(
    (value: string) => {
      setLookupSearch(value);
      if (!lookupColumnId) {
        return;
      }
      // Live-sync popup typing back to toolbar input.
      setExternalSelection({
        columnId: lookupColumnId,
        item: { code: value, name: value },
      });
    },
    [lookupColumnId],
  );

  const onLookupPopupClose = useCallback(() => {
    setLookupPopupOpen(false);
    setExternalSelection(null);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedLookupSearch(lookupSearch);
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [lookupSearch]);

  const onLookupSelect = useCallback(
    (item: LookupItem, columnId: string) => {
      if (!columnId) {
        return;
      }

      const column = table.getColumn(columnId);
      if (!column) {
        return;
      }

      if (columnId === "DocNum") {
        column.setFilterValue(item.code);
      } else if (columnId === "CardCode") {
        column.setFilterValue(item.code);
      } else if (columnId === "CardName") {
        column.setFilterValue(item.name);
      } else {
        column.setFilterValue(item.name);
      }

      onSetActiveFilter?.(tableId, columnId);

      // Immediate input sync for toolbar input without effect-based mirroring.
      setExternalSelection({ columnId, item });
      setLookupPopupOpen(false);
    },
    [onSetActiveFilter, table, tableId],
  );

  return {
    debouncedLookupSearch,
    externalSelection,
    lookupColumnId,
    lookupPopupOpen,
    lookupSearch,
    onLookupPopupClose,
    onLookupPopupIntent,
    onLookupPopupOpen,
    onLookupSearchChange,
    onLookupSelect,
  };
}
