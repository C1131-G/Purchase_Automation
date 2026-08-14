import type {
  ProductBatchAllocation,
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  allocatedBatchQuantity,
  allocatedSerialCount,
  isBatchManaged,
  isSerialManaged,
  lotAllocationError,
  sanitizeLotNumberInput,
} from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import type {
  ItemDefaultBin,
  LotSetupKind,
  LotSetupStep,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";

const QTY_EPSILON = 0.0001;

export const lineNeededQty = (row: Pick<ProductRow, "quantity">): number => {
  const qty = Number(row.quantity);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
};

export const compactDateStamp = (isoDate: string): string => {
  const digits = isoDate.replaceAll(/[^0-9]/g, "").slice(0, 8);
  if (digits.length === 8) {
    return digits;
  }
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
};

export const suggestBatchNumber = (docDate: string, lineIndex: number): string =>
  sanitizeLotNumberInput(`B${compactDateStamp(docDate)}${String(lineIndex + 1).padStart(3, "0")}`);

export const suggestSerialNumber = (
  docDate: string,
  lineIndex: number,
  serialIndex: number,
): string =>
  sanitizeLotNumberInput(
    `S${compactDateStamp(docDate)}${String(lineIndex + 1).padStart(3, "0")}${String(serialIndex + 1).padStart(3, "0")}`,
  );

export const applyDefaultBinToBatch = (
  row: ProductBatchAllocation,
  defaultBin?: ItemDefaultBin | null,
): ProductBatchAllocation => {
  if (!defaultBin || Number(row.binAbsEntry) > 0) {
    return row;
  }
  return { ...row, binAbsEntry: defaultBin.binAbsEntry, binCode: defaultBin.binCode };
};

export const applyDefaultBinToSerial = (
  row: ProductSerialAllocation,
  defaultBin?: ItemDefaultBin | null,
): ProductSerialAllocation => {
  if (!defaultBin || Number(row.binAbsEntry) > 0) {
    return row;
  }
  return { ...row, binAbsEntry: defaultBin.binAbsEntry, binCode: defaultBin.binCode };
};

export const seedBatchAllocations = (
  row: ProductRow,
  lineIndex: number,
  docDate: string,
  defaultBin?: ItemDefaultBin | null,
): ProductBatchAllocation[] => {
  const needed = lineNeededQty(row);
  const existing = row.batchNumbers ?? [];
  if (existing.some((batch) => batch.batchNumber.trim())) {
    return resizeBatchAllocations(existing, needed, lineIndex, docDate, defaultBin);
  }
  return [
    applyDefaultBinToBatch(
      {
        batchNumber: suggestBatchNumber(docDate, lineIndex),
        quantity: needed,
      },
      defaultBin,
    ),
  ];
};

export const resizeBatchAllocations = (
  batches: ProductBatchAllocation[],
  needed: number,
  lineIndex: number,
  docDate: string,
  defaultBin?: ItemDefaultBin | null,
): ProductBatchAllocation[] => {
  if (needed <= 0) {
    return [];
  }
  const next = batches
    .filter((batch) => batch.batchNumber.trim() || Number(batch.quantity) > 0)
    .map((batch) => applyDefaultBinToBatch({ ...batch }, defaultBin));
  if (next.length === 0) {
    return [
      applyDefaultBinToBatch(
        {
          batchNumber: suggestBatchNumber(docDate, lineIndex),
          quantity: needed,
        },
        defaultBin,
      ),
    ];
  }
  const allocated = allocatedBatchQuantity(next);
  const delta = needed - allocated;
  if (Math.abs(delta) <= QTY_EPSILON) {
    return next;
  }
  const lastIndex = next.length - 1;
  const last = next[lastIndex];
  if (!last) {
    return next;
  }
  const adjustedLastQty = Number(last.quantity) + delta;
  if (adjustedLastQty > QTY_EPSILON) {
    next[lastIndex] = { ...last, quantity: adjustedLastQty };
    return next;
  }
  const kept = next.slice(0, -1);
  return resizeBatchAllocations(kept, needed, lineIndex, docDate, defaultBin);
};

export const addBatchSplitRow = (
  batches: ProductBatchAllocation[],
  lineIndex: number,
  docDate: string,
  defaultBin?: ItemDefaultBin | null,
): ProductBatchAllocation[] => [
  ...batches,
  applyDefaultBinToBatch(
    {
      batchNumber: suggestBatchNumber(docDate, lineIndex + batches.length),
      quantity: 0,
    },
    defaultBin,
  ),
];

export const seedSerialAllocations = (
  row: ProductRow,
  lineIndex: number,
  docDate: string,
  defaultBin?: ItemDefaultBin | null,
): ProductSerialAllocation[] => {
  const needed = Math.max(0, Math.trunc(lineNeededQty(row)));
  const existing = (row.serialNumbers ?? []).map((serial) =>
    applyDefaultBinToSerial({ ...serial }, defaultBin),
  );
  const next: ProductSerialAllocation[] = [];
  for (let index = 0; index < needed; index += 1) {
    const current = existing[index];
    if (current?.internalSerialNumber.trim()) {
      next.push({ ...current, quantity: 1 });
      continue;
    }
    next.push(
      applyDefaultBinToSerial(
        {
          internalSerialNumber: suggestSerialNumber(docDate, lineIndex, index),
          quantity: 1,
        },
        defaultBin,
      ),
    );
  }
  return next;
};

export const createdQtyForKind = (row: ProductRow, kind: LotSetupKind): number => {
  if (kind === "batches") {
    return allocatedBatchQuantity(row.batchNumbers);
  }
  return allocatedSerialCount(row.serialNumbers);
};

export const openQtyForKind = (row: ProductRow, kind: LotSetupKind): number =>
  Math.max(0, lineNeededQty(row) - createdQtyForKind(row, kind));

export const isLotQtyBalanced = (row: ProductRow, kind: LotSetupKind): boolean =>
  Math.abs(lineNeededQty(row) - createdQtyForKind(row, kind)) <= QTY_EPSILON;

export const lotManagedRows = (rows: ProductRow[], kind: LotSetupKind): ProductRow[] =>
  rows.filter((row) => (kind === "batches" ? isBatchManaged(row) : isSerialManaged(row)));

export const hasLotKindRows = (rows: ProductRow[], kind: LotSetupKind): boolean =>
  lotManagedRows(rows, kind).some((row) => lineNeededQty(row) > 0);

export const resolveLotSetupStep = (
  rows: ProductRow[],
  confirmed: { batchesConfirmed: boolean; serialsConfirmed: boolean },
): LotSetupStep => {
  if (hasLotKindRows(rows, "serials") && !confirmed.serialsConfirmed) {
    return "serials";
  }
  if (hasLotKindRows(rows, "batches") && !confirmed.batchesConfirmed) {
    return "batches";
  }
  return "submit";
};

export const lotSetupPath = (kind: Exclude<LotSetupStep, "submit">): string =>
  kind === "serials" ? "/purchase/grpo-lots/serials" : "/purchase/grpo-lots/batches";

export const GRPO_CREATE_LOT_ACTIONS = ["save-new", "view", "close", "draft"] as const;

export const shouldOpenGrpoLotSetup = (isEditMode: boolean, action: string): boolean =>
  !isEditMode && (GRPO_CREATE_LOT_ACTIONS as readonly string[]).includes(action);

export const resolveGrpoLotIntercept = (input: {
  action: string;
  confirmed: { batchesConfirmed: boolean; serialsConfirmed: boolean };
  isEditMode: boolean;
  rows: ProductRow[];
}): { path: string; type: "navigate" } | { type: "submit" } => {
  if (!shouldOpenGrpoLotSetup(input.isEditMode, input.action)) {
    return { type: "submit" };
  }
  const step = resolveLotSetupStep(input.rows, input.confirmed);
  if (step === "submit") {
    return { type: "submit" };
  }
  return { path: lotSetupPath(step), type: "navigate" };
};

export const resolveLotSetupAfterOk = (input: {
  confirmed: { batchesConfirmed: boolean; serialsConfirmed: boolean };
  hasPendingCreateAction: boolean;
  kind: LotSetupKind;
  rows: ProductRow[];
}): { path: string; type: "next" } | { type: "continue-submit" } | { type: "return" } => {
  const next = resolveLotSetupStep(input.rows, {
    batchesConfirmed: input.kind === "batches" ? true : input.confirmed.batchesConfirmed,
    serialsConfirmed: input.kind === "serials" ? true : input.confirmed.serialsConfirmed,
  });
  if (next !== "submit" && input.hasPendingCreateAction) {
    return { path: lotSetupPath(next), type: "next" };
  }
  if (input.hasPendingCreateAction) {
    return { type: "continue-submit" };
  }
  return { type: "return" };
};

export const lotSetupRowError = (
  row: ProductRow,
  kind: LotSetupKind,
  binRequired: boolean,
): string | null => {
  const base = lotAllocationError(row, true);
  if (base) {
    return base;
  }
  if (!binRequired) {
    return null;
  }
  const lots = kind === "batches" ? row.batchNumbers : row.serialNumbers;
  const missingBin = (lots ?? []).some((lot) => !Number(lot.binAbsEntry));
  if (missingBin) {
    return `Select a bin location for ${row.productCode || "item"}.`;
  }
  return null;
};
