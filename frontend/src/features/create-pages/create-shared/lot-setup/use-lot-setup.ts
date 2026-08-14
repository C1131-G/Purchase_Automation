import { useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { LotSetupKind } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import {
  addBatchSplitRow,
  createdQtyForKind,
  lotManagedRows,
  lotSetupRowError,
  openQtyForKind,
  seedBatchAllocations,
  seedSerialAllocations,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import type {
  ProductBatchAllocation,
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { sanitizeLotNumberInput } from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import {
  useGRPOHeader,
  useGRPOLines,
  useSetGRPOLinesAction,
} from "@/store/create/grpo-create.store";
import { useGRPOLotSessionStore } from "@/store/create/grpo-lot-session.store";

const binKey = (itemCode: string, warehouseCode: string): string =>
  `${itemCode.trim()}::${warehouseCode.trim()}`;

export function useLotSetup(kind: LotSetupKind, selectedRowId?: string) {
  const header = useGRPOHeader();
  const lines = useGRPOLines();
  const setLines = useSetGRPOLinesAction();
  const docLabel = useGRPOLotSessionStore((state) => state.docLabel);
  const warehousesQuery = useQuery(createSharedQueries.warehouses());
  const documentRows = useMemo(() => lotManagedRows(lines, kind), [kind, lines]);
  const [activeRowId, setActiveRowId] = useState<string | null>(
    selectedRowId || documentRows[0]?.id || null,
  );
  const seededRef = useRef(false);

  useEffect(() => {
    if (selectedRowId && documentRows.some((row) => row.id === selectedRowId)) {
      setActiveRowId(selectedRowId);
      return;
    }
    if (!activeRowId || !documentRows.some((row) => row.id === activeRowId)) {
      setActiveRowId(documentRows[0]?.id ?? null);
    }
  }, [activeRowId, documentRows, selectedRowId]);

  const warehouseBinEnabled = useMemo(() => {
    const enabled = new Map<string, boolean>();
    for (const warehouse of warehousesQuery.data ?? []) {
      enabled.set(String(warehouse.code), warehouse.enableBinLocations === true);
    }
    return enabled;
  }, [warehousesQuery.data]);

  const warehouseNameByCode = useMemo(() => {
    const names = new Map<string, string>();
    for (const warehouse of warehousesQuery.data ?? []) {
      names.set(String(warehouse.code), warehouse.name);
    }
    return names;
  }, [warehousesQuery.data]);

  const defaultBinPairs = useMemo(() => {
    const pairs: Array<{ itemCode: string; warehouseCode: string }> = [];
    const seen = new Set<string>();
    for (const row of documentRows) {
      const itemCode = row.productCode.trim();
      const warehouseCode = row.warehouseCode.trim();
      const key = binKey(itemCode, warehouseCode);
      if (!itemCode || !warehouseCode || seen.has(key)) {
        continue;
      }
      if (!warehouseBinEnabled.get(warehouseCode)) {
        continue;
      }
      seen.add(key);
      pairs.push({ itemCode, warehouseCode });
    }
    return pairs;
  }, [documentRows, warehouseBinEnabled]);

  const defaultBinQueries = useQueries({
    queries: defaultBinPairs.map((pair) =>
      createSharedQueries.itemDefaultBin(pair.itemCode, pair.warehouseCode),
    ),
  });

  const defaultBinByKey = useMemo(() => {
    const bins = new Map<string, { binAbsEntry: number; binCode: string }>();
    for (const [index, pair] of defaultBinPairs.entries()) {
      const data = defaultBinQueries[index]?.data;
      if (!data) {
        continue;
      }
      bins.set(binKey(pair.itemCode, pair.warehouseCode), data);
    }
    return bins;
  }, [defaultBinPairs, defaultBinQueries]);

  useEffect(() => {
    if (seededRef.current || documentRows.length === 0) {
      return;
    }
    seededRef.current = true;
    const docDate = header.docDate;
    setLines((prev) =>
      prev.map((row) => {
        const lineIndex = prev.findIndex((item) => item.id === row.id);
        const defaultBin = defaultBinByKey.get(binKey(row.productCode, row.warehouseCode));
        if (kind === "batches" && row.manBtchNum === "Y") {
          return {
            ...row,
            batchNumbers: seedBatchAllocations(row, lineIndex, docDate, defaultBin),
          };
        }
        if (kind === "serials" && row.manSerNum === "Y") {
          return {
            ...row,
            serialNumbers: seedSerialAllocations(row, lineIndex, docDate, defaultBin),
          };
        }
        return row;
      }),
    );
  }, [defaultBinByKey, documentRows.length, header.docDate, kind, setLines]);

  useEffect(() => {
    if (defaultBinByKey.size === 0) {
      return;
    }
    setLines((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        const defaultBin = defaultBinByKey.get(binKey(row.productCode, row.warehouseCode));
        if (!defaultBin) {
          return row;
        }
        if (kind === "batches" && row.batchNumbers?.some((batch) => !batch.binAbsEntry)) {
          changed = true;
          return {
            ...row,
            batchNumbers: row.batchNumbers.map((batch) =>
              batch.binAbsEntry
                ? batch
                : { ...batch, binAbsEntry: defaultBin.binAbsEntry, binCode: defaultBin.binCode },
            ),
          };
        }
        if (kind === "serials" && row.serialNumbers?.some((serial) => !serial.binAbsEntry)) {
          changed = true;
          return {
            ...row,
            serialNumbers: row.serialNumbers.map((serial) =>
              serial.binAbsEntry
                ? serial
                : { ...serial, binAbsEntry: defaultBin.binAbsEntry, binCode: defaultBin.binCode },
            ),
          };
        }
        return row;
      });
      return changed ? next : prev;
    });
  }, [defaultBinByKey, kind, setLines]);

  const activeRow = documentRows.find((row) => row.id === activeRowId) ?? null;
  const binRequired = activeRow
    ? warehouseBinEnabled.get(activeRow.warehouseCode.trim()) === true
    : false;

  const patchRow = useCallback(
    (rowId: string, patch: Partial<ProductRow>) => {
      setLines((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) {
            return row;
          }
          const next = { ...row, ...patch };
          if (patch.quantity !== undefined) {
            next.quantity = Math.max(0, Number(patch.quantity) || 0);
            const lineIndex = prev.findIndex((item) => item.id === rowId);
            const defaultBin = defaultBinByKey.get(binKey(next.productCode, next.warehouseCode));
            if (kind === "batches") {
              next.batchNumbers = seedBatchAllocations(next, lineIndex, header.docDate, defaultBin);
            } else {
              next.serialNumbers = seedSerialAllocations(
                next,
                lineIndex,
                header.docDate,
                defaultBin,
              );
            }
          }
          return next;
        }),
      );
    },
    [defaultBinByKey, header.docDate, kind, setLines],
  );

  const setBatches = useCallback(
    (rowId: string, batches: ProductBatchAllocation[]) => {
      setLines((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, batchNumbers: batches } : row)),
      );
    },
    [setLines],
  );

  const setSerials = useCallback(
    (rowId: string, serials: ProductSerialAllocation[]) => {
      setLines((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, serialNumbers: serials } : row)),
      );
    },
    [setLines],
  );

  const splitActiveBatch = useCallback(() => {
    if (!activeRow) {
      return;
    }
    const lineIndex = lines.findIndex((row) => row.id === activeRow.id);
    const defaultBin = defaultBinByKey.get(binKey(activeRow.productCode, activeRow.warehouseCode));
    setBatches(
      activeRow.id,
      addBatchSplitRow(activeRow.batchNumbers ?? [], lineIndex, header.docDate, defaultBin),
    );
  }, [activeRow, defaultBinByKey, header.docDate, lines, setBatches]);

  const updateActiveBatch = useCallback(
    (index: number, patch: Partial<ProductBatchAllocation>) => {
      if (!activeRow) {
        return;
      }
      const next = (activeRow.batchNumbers ?? []).map((batch, batchIndex) => {
        if (batchIndex !== index) {
          return batch;
        }
        return {
          ...batch,
          ...patch,
          ...(patch.batchNumber !== undefined
            ? { batchNumber: sanitizeLotNumberInput(patch.batchNumber) }
            : {}),
        };
      });
      setBatches(activeRow.id, next);
    },
    [activeRow, setBatches],
  );

  const removeActiveBatch = useCallback(
    (index: number) => {
      if (!activeRow) {
        return;
      }
      setBatches(
        activeRow.id,
        (activeRow.batchNumbers ?? []).filter((_, batchIndex) => batchIndex !== index),
      );
    },
    [activeRow, setBatches],
  );

  const updateActiveSerial = useCallback(
    (index: number, patch: Partial<ProductSerialAllocation>) => {
      if (!activeRow) {
        return;
      }
      const next = (activeRow.serialNumbers ?? []).map((serial, serialIndex) => {
        if (serialIndex !== index) {
          return serial;
        }
        return {
          ...serial,
          ...patch,
          quantity: 1,
          ...(patch.internalSerialNumber !== undefined
            ? { internalSerialNumber: sanitizeLotNumberInput(patch.internalSerialNumber) }
            : {}),
        };
      });
      setSerials(activeRow.id, next);
    },
    [activeRow, setSerials],
  );

  const pageError = useMemo(() => {
    for (const row of documentRows) {
      const required = warehouseBinEnabled.get(row.warehouseCode.trim()) === true;
      const error = lotSetupRowError(row, kind, required);
      if (error) {
        return error;
      }
    }
    return null;
  }, [documentRows, kind, warehouseBinEnabled]);

  const footerCreatedQty = documentRows.reduce((sum, row) => sum + createdQtyForKind(row, kind), 0);
  const footerCreatedCount =
    kind === "batches"
      ? documentRows.reduce((sum, row) => sum + (row.batchNumbers?.length ?? 0), 0)
      : documentRows.reduce((sum, row) => sum + (row.serialNumbers?.length ?? 0), 0);

  return {
    activeRow,
    activeRowId,
    binRequired,
    docLabel: docLabel || "New",
    documentRows,
    footerCreatedCount,
    footerCreatedQty,
    openQty: activeRow ? openQtyForKind(activeRow, kind) : 0,
    pageError,
    patchRow,
    removeActiveBatch,
    setActiveRowId,
    splitActiveBatch,
    updateActiveBatch,
    updateActiveSerial,
    warehouseNameByCode,
  };
}
