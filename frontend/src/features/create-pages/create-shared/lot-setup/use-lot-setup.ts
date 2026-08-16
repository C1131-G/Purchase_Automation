import { useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { LotSetupKind } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import {
  addBatchSplitRow,
  addSerialSplitRow,
  applyBatchAutoFill,
  applySerialAutoFill,
  buildSerialAutoFillNumbers,
  createdQtyForKind,
  lineNeededQty,
  lotManagedRows,
  lotSetupRowError,
  rebalanceBatchQuantities,
  sameBatchAllocations,
  seedBatchAllocations,
  seedSerialAllocations,
  type SerialAutoFillInput,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import type {
  ProductBatchAllocation,
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  isBatchManaged,
  isSerialManaged,
  sanitizeLotNumberInput,
} from "@/features/create-pages/create-shared/utils/product-lot-allocations";
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

  const warehouseNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const warehouse of warehousesQuery.data ?? []) {
      const code = String(warehouse.code).trim();
      const name = String(warehouse.name ?? "").trim();
      if (code) {
        names[code] = name || code;
      }
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
      seen.add(key);
      pairs.push({ itemCode, warehouseCode });
    }
    return pairs;
  }, [documentRows]);

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
    setLines((prev) => {
      let changed = false;
      const next = prev.map((row, lineIndex) => {
        const defaultBin = defaultBinByKey.get(binKey(row.productCode, row.warehouseCode));
        if (kind === "batches" && isBatchManaged(row) && lineNeededQty(row) > 0) {
          const nextBatches = seedBatchAllocations(row, lineIndex, header.docDate, defaultBin);
          if (!sameBatchAllocations(row.batchNumbers, nextBatches)) {
            changed = true;
            return { ...row, batchNumbers: nextBatches };
          }
        }
        if (kind === "serials" && isSerialManaged(row)) {
          const needed = Math.max(0, Math.trunc(lineNeededQty(row)));
          const count = row.serialNumbers?.length ?? 0;
          if (count !== needed && needed > 0) {
            changed = true;
            return {
              ...row,
              serialNumbers: seedSerialAllocations(row, lineIndex, header.docDate, defaultBin),
            };
          }
          if (defaultBin && row.serialNumbers?.some((serial) => !serial.binAbsEntry)) {
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
        }
        return row;
      });
      return changed ? next : prev;
    });
  }, [defaultBinByKey, header.docDate, kind, setLines]);

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
            next.quantity = Math.max(1, Number(patch.quantity) || 1);
            const lineIndex = prev.findIndex((item) => item.id === rowId);
            const defaultBin = defaultBinByKey.get(binKey(next.productCode, next.warehouseCode));
            if (kind === "batches" && isBatchManaged(next)) {
              next.batchNumbers = seedBatchAllocations(next, lineIndex, header.docDate, defaultBin);
            } else if (kind === "serials" && isSerialManaged(next)) {
              const hasSerials = (row.serialNumbers?.length ?? 0) > 0;
              if (hasSerials) {
                next.serialNumbers = seedSerialAllocations(
                  next,
                  lineIndex,
                  header.docDate,
                  defaultBin,
                );
              }
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
        prev.map((row) => {
          if (row.id !== rowId) {
            return row;
          }
          return { ...row, batchNumbers: batches };
        }),
      );
    },
    [setLines],
  );

  const setSerials = useCallback(
    (rowId: string, serials: ProductSerialAllocation[]) => {
      setLines((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) {
            return row;
          }
          return { ...row, serialNumbers: serials };
        }),
      );
    },
    [setLines],
  );

  const defaultBinFor = useCallback(
    (row: ProductRow) => defaultBinByKey.get(binKey(row.productCode, row.warehouseCode)),
    [defaultBinByKey],
  );

  const splitActiveBatch = useCallback(() => {
    if (!activeRow) {
      return;
    }
    const lineIndex = lines.findIndex((row) => row.id === activeRow.id);
    const next = addBatchSplitRow(
      activeRow.batchNumbers ?? [],
      lineNeededQty(activeRow),
      lineIndex,
      header.docDate,
      defaultBinFor(activeRow),
    );
    setBatches(activeRow.id, next);
  }, [activeRow, defaultBinFor, header.docDate, lines, setBatches]);

  const splitActiveSerial = useCallback(() => {
    if (!activeRow) {
      return;
    }
    const lineIndex = lines.findIndex((row) => row.id === activeRow.id);
    const next = addSerialSplitRow(
      activeRow.serialNumbers ?? [],
      lineIndex,
      header.docDate,
      defaultBinFor(activeRow),
      lineNeededQty(activeRow),
    );
    setSerials(activeRow.id, next);
  }, [activeRow, defaultBinFor, header.docDate, lines, setSerials]);

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
      const balanced =
        patch.quantity === undefined
          ? next
          : rebalanceBatchQuantities(next, lineNeededQty(activeRow), index);
      setBatches(activeRow.id, balanced);
    },
    [activeRow, setBatches],
  );

  const removeActiveBatch = useCallback(
    (index: number) => {
      if (!activeRow) {
        return;
      }
      const remaining = (activeRow.batchNumbers ?? []).filter(
        (_, batchIndex) => batchIndex !== index,
      );
      if (remaining.length === 0) {
        const lineIndex = lines.findIndex((row) => row.id === activeRow.id);
        setBatches(
          activeRow.id,
          seedBatchAllocations(activeRow, lineIndex, header.docDate, defaultBinFor(activeRow)),
        );
        return;
      }
      setBatches(activeRow.id, rebalanceBatchQuantities(remaining, lineNeededQty(activeRow)));
    },
    [activeRow, defaultBinFor, header.docDate, lines, setBatches],
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

  const removeActiveSerial = useCallback(
    (index: number) => {
      if (!activeRow) {
        return;
      }
      const remaining = (activeRow.serialNumbers ?? []).filter(
        (_, serialIndex) => serialIndex !== index,
      );
      setSerials(activeRow.id, remaining);
    },
    [activeRow, setSerials],
  );

  const applyActiveSerialAutoFill = useCallback(
    (input: Omit<SerialAutoFillInput, "count">) => {
      if (!activeRow) {
        return false;
      }
      const serials = activeRow.serialNumbers ?? [];
      const numbers = buildSerialAutoFillNumbers({ ...input, count: serials.length });
      if (numbers.length !== serials.length) {
        return false;
      }
      setSerials(activeRow.id, applySerialAutoFill(serials, numbers));
      return true;
    },
    [activeRow, setSerials],
  );

  const applyActiveBatchAutoFill = useCallback(
    (input: Omit<SerialAutoFillInput, "count">) => {
      if (!activeRow) {
        return false;
      }
      const batches = activeRow.batchNumbers ?? [];
      const numbers = buildSerialAutoFillNumbers({ ...input, count: batches.length });
      if (numbers.length !== batches.length) {
        return false;
      }
      setBatches(activeRow.id, applyBatchAutoFill(batches, numbers));
      return true;
    },
    [activeRow, setBatches],
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
    applyActiveBatchAutoFill,
    applyActiveSerialAutoFill,
    binRequired,
    docLabel: docLabel || "New",
    documentRows,
    footerCreatedCount,
    footerCreatedQty,
    pageError,
    patchRow,
    removeActiveBatch,
    removeActiveSerial,
    setActiveRowId,
    splitActiveBatch,
    splitActiveSerial,
    updateActiveBatch,
    updateActiveSerial,
    warehouseNames,
  };
}
