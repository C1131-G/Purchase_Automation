import type {
  ProductBatchAllocation,
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  allocatedBatchQuantity,
  allocatedSerialCount,
  firstRequiredLotError,
  isBatchManaged,
  isSerialManaged,
  lotAllocationError,
  sanitizeLotNumberInput,
} from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import type {
  GrpoCreateSearch,
  ItemDefaultBin,
  LotSetupKind,
  LotSetupReturnTo,
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

/** Batch numbers use calendar date as ddmmyyyy (e.g. 14/08/2026 → 14082026). */
export const batchDateStamp = (isoDate: string): string => {
  const yyyymmdd = compactDateStamp(isoDate);
  if (yyyymmdd.length === 8) {
    return `${yyyymmdd.slice(6, 8)}${yyyymmdd.slice(4, 6)}${yyyymmdd.slice(0, 4)}`;
  }
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}${month}${now.getFullYear()}`;
};

/** Rewrite leftover auto stamps that used yyyymmdd instead of ddmmyyyy. */
export const normalizeBatchNumberStamp = (batchNumber: string, docDate: string): string => {
  const trimmed = batchNumber.trim();
  if (!trimmed) {
    return trimmed;
  }
  const oldStamp = compactDateStamp(docDate);
  const newStamp = batchDateStamp(docDate);
  if (oldStamp.length === 8 && trimmed.startsWith(oldStamp)) {
    return `${newStamp}${trimmed.slice(oldStamp.length)}`;
  }
  return trimmed;
};

export const suggestBatchNumber = (
  docDate: string,
  lineIndex: number,
  batchIndex: number = 0,
): string => {
  const dateStr = batchDateStamp(docDate);
  if (lineIndex === 0 && batchIndex === 0) {
    return dateStr;
  }
  if (batchIndex === 0) {
    return sanitizeLotNumberInput(`${dateStr}${String(lineIndex + 1).padStart(2, "0")}`);
  }
  return sanitizeLotNumberInput(`${dateStr}B${batchIndex + 1}`);
};

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
        batchNumber: suggestBatchNumber(docDate, lineIndex, 0),
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
    .map((batch) =>
      applyDefaultBinToBatch(
        { ...batch, batchNumber: normalizeBatchNumberStamp(batch.batchNumber, docDate) },
        defaultBin,
      ),
    );
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
  let allocated = allocatedBatchQuantity(next);
  if (allocated <= needed + QTY_EPSILON) {
    return next;
  }
  let overflow = allocated - needed;
  for (let index = next.length - 1; index >= 0 && overflow > QTY_EPSILON; index -= 1) {
    const current = next[index];
    if (!current) {
      continue;
    }
    const qty = Number(current.quantity) || 0;
    const take = Math.min(qty, overflow);
    const reduced = qty - take;
    overflow -= take;
    if (reduced > QTY_EPSILON) {
      next[index] = { ...current, quantity: reduced };
    } else {
      next.splice(index, 1);
    }
  }
  if (next.length === 0 && needed > 0) {
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
  return next;
};

export const addBatchSplitRow = (
  batches: ProductBatchAllocation[],
  needed: number,
  lineIndex: number,
  docDate: string,
  defaultBin?: ItemDefaultBin | null,
): ProductBatchAllocation[] => {
  const remaining = Math.max(0, needed - allocatedBatchQuantity(batches));
  if (remaining <= QTY_EPSILON) {
    return batches;
  }
  return [
    ...batches,
    applyDefaultBinToBatch(
      {
        batchNumber: suggestBatchNumber(docDate, lineIndex, batches.length),
        quantity: remaining,
      },
      defaultBin,
    ),
  ];
};

export const sameBatchAllocations = (
  left: ProductBatchAllocation[] | undefined,
  right: ProductBatchAllocation[] | undefined,
): boolean => {
  const a = left ?? [];
  const b = right ?? [];
  if (a.length !== b.length) {
    return false;
  }
  return a.every((batch, index) => {
    const other = b[index];
    if (!other) {
      return false;
    }
    return (
      batch.batchNumber === other.batchNumber &&
      Number(batch.quantity) === Number(other.quantity) &&
      Number(batch.binAbsEntry ?? 0) === Number(other.binAbsEntry ?? 0) &&
      (batch.binCode ?? "") === (other.binCode ?? "") &&
      (batch.expiryDate ?? "") === (other.expiryDate ?? "")
    );
  });
};

/** Keep the qty the user typed. Never auto-fill leftover; only cap so total cannot exceed Needed. */
export const rebalanceBatchQuantities = (
  batches: ProductBatchAllocation[],
  needed: number,
  editedIndex?: number,
): ProductBatchAllocation[] => {
  if (batches.length === 0) {
    return batches;
  }
  const next = batches.map((batch) => ({
    ...batch,
    quantity: Math.max(0, Number(batch.quantity) || 0),
  }));
  if (editedIndex !== undefined && next[editedIndex]) {
    const others = next.reduce((sum, batch, index) => {
      if (index === editedIndex) {
        return sum;
      }
      return sum + Number(batch.quantity || 0);
    }, 0);
    const maxEdited = Math.max(0, needed - others);
    next[editedIndex] = {
      ...next[editedIndex]!,
      quantity: Math.min(Number(next[editedIndex]!.quantity) || 0, maxEdited),
    };
  }
  return next;
};

const emptySerialAllocation = (defaultBin?: ItemDefaultBin | null): ProductSerialAllocation =>
  applyDefaultBinToSerial({ internalSerialNumber: "", quantity: 1 }, defaultBin);

export type SerialAutoFillDirection = "increase" | "decrease";
export type SerialAutoFillPartKind = "string" | "number";

export interface SerialAutoFillPart {
  kind: SerialAutoFillPartKind;
  value: string;
}

export interface SerialAutoFillInput {
  count: number;
  direction: SerialAutoFillDirection;
  parts: SerialAutoFillPart[];
}

export const formatSerialAutoFillValue = (prefix: string, suffix: string): string => {
  const cleanPrefix = sanitizeLotNumberInput(prefix).replace(/-+$/g, "");
  const cleanSuffix = sanitizeLotNumberInput(suffix).replace(/^-+/g, "");
  if (!cleanPrefix) {
    return cleanSuffix;
  }
  if (!cleanSuffix) {
    return cleanPrefix;
  }
  return sanitizeLotNumberInput(`${cleanPrefix}-${cleanSuffix}`);
};

export const joinSerialAutoFillParts = (parts: string[]): string => {
  let joined = "";
  for (const part of parts) {
    joined = formatSerialAutoFillValue(joined, part);
  }
  return joined;
};

const steppedNumberValue = (
  raw: string,
  index: number,
  direction: SerialAutoFillDirection,
): string | null => {
  const start = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(start)) {
    return null;
  }
  const step = direction === "decrease" ? -1 : 1;
  const digits = raw.trim().replace(/^-/, "");
  const pad = digits.length > 1 && digits.startsWith("0") ? digits.length : 1;
  const value = start + index * step;
  if (value < 0) {
    return null;
  }
  return String(value).padStart(pad, "0");
};

const bumpSerialChar = (char: string): { carry: boolean; next: string } => {
  if (char >= "A" && char <= "Y") {
    return { carry: false, next: String.fromCharCode(char.charCodeAt(0) + 1) };
  }
  if (char >= "a" && char <= "y") {
    return { carry: false, next: String.fromCharCode(char.charCodeAt(0) + 1) };
  }
  if (char === "Z") {
    return { carry: true, next: "A" };
  }
  if (char === "z") {
    return { carry: true, next: "a" };
  }
  if (char >= "0" && char <= "8") {
    return { carry: false, next: String.fromCharCode(char.charCodeAt(0) + 1) };
  }
  if (char === "9") {
    return { carry: true, next: "0" };
  }
  return { carry: true, next: char };
};

export const nextSerialString = (value: string): string => {
  const chars = [...sanitizeLotNumberInput(value)];
  if (chars.length === 0) {
    return "A";
  }
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const current = chars[index];
    if (!current || current === "-") {
      continue;
    }
    const bumped = bumpSerialChar(current);
    chars[index] = bumped.next;
    if (!bumped.carry) {
      return chars.join("");
    }
  }
  return `A${chars.join("")}`;
};

export const buildSerialAutoFillNumbers = (input: SerialAutoFillInput): string[] => {
  const count = Math.max(0, Math.trunc(input.count));
  const parts = input.parts.filter((part) => part.value.trim());
  if (count === 0 || parts.length === 0) {
    return [];
  }

  const lastNumberIndex = parts.findLastIndex((part) => part.kind === "number");
  const lastStringIndex = parts.findLastIndex((part) => part.kind === "string");
  const next: string[] = [];

  for (let rowIndex = 0; rowIndex < count; rowIndex += 1) {
    const pieces: string[] = [];
    for (const [partIndex, part] of parts.entries()) {
      if (part.kind === "number") {
        const shouldStep = partIndex === lastNumberIndex;
        const value = shouldStep
          ? steppedNumberValue(part.value, rowIndex, input.direction)
          : steppedNumberValue(part.value, 0, "increase");
        if (value === null) {
          return [];
        }
        pieces.push(value);
        continue;
      }
      const seed = sanitizeLotNumberInput(part.value);
      if (!seed) {
        continue;
      }
      if (lastNumberIndex < 0 && partIndex === lastStringIndex && rowIndex > 0) {
        let current = seed;
        for (let stepIndex = 0; stepIndex < rowIndex; stepIndex += 1) {
          current = nextSerialString(current);
        }
        pieces.push(current);
        continue;
      }
      pieces.push(seed);
    }
    const serial = joinSerialAutoFillParts(pieces);
    if (!serial) {
      return [];
    }
    next.push(serial);
  }
  return next;
};

export const applySerialAutoFill = (
  serials: ProductSerialAllocation[],
  numbers: string[],
): ProductSerialAllocation[] =>
  serials.map((serial, index) => {
    const number = numbers[index];
    if (!number) {
      return serial;
    }
    return { ...serial, internalSerialNumber: number, quantity: 1 };
  });

export const applyBatchAutoFill = (
  batches: ProductBatchAllocation[],
  numbers: string[],
): ProductBatchAllocation[] =>
  batches.map((batch, index) => {
    const number = numbers[index];
    if (!number) {
      return batch;
    }
    return { ...batch, batchNumber: number };
  });

export const addSerialSplitRow = (
  serials: ProductSerialAllocation[],
  _lineIndex: number,
  _docDate: string,
  defaultBin?: ItemDefaultBin | null,
  needed?: number,
): ProductSerialAllocation[] => {
  const maxRows = needed === undefined ? Number.POSITIVE_INFINITY : Math.max(0, Math.trunc(needed));
  if (serials.length >= maxRows) {
    return serials;
  }
  return [...serials, emptySerialAllocation(defaultBin)];
};

export const documentQtyFromBatches = (batches: ProductBatchAllocation[] | undefined): number =>
  allocatedBatchQuantity(batches);

export const documentQtyFromSerials = (serials: ProductSerialAllocation[] | undefined): number =>
  allocatedSerialCount(serials);

export const seedSerialAllocations = (
  row: ProductRow,
  _lineIndex: number,
  _docDate: string,
  defaultBin?: ItemDefaultBin | null,
): ProductSerialAllocation[] => {
  const needed = Math.max(0, Math.trunc(lineNeededQty(row)));
  const existing = (row.serialNumbers ?? []).map((serial) =>
    applyDefaultBinToSerial({ ...serial }, defaultBin),
  );
  const next: ProductSerialAllocation[] = [];
  for (let index = 0; index < needed; index += 1) {
    const current = existing[index];
    if (current) {
      next.push({ ...current, quantity: 1 });
      continue;
    }
    next.push(emptySerialAllocation(defaultBin));
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

/** @deprecated Route-based lot setup removed. Kind is handled inside the modal now. */
export const lotSetupPath = (_kind: Exclude<LotSetupStep, "submit">): string =>
  "/purchase/create-grpo";

export const lotSetupKindForRow = (
  row: Pick<ProductRow, "manBtchNum" | "manSerNum">,
): Exclude<LotSetupStep, "submit"> => (isSerialManaged(row) ? "serials" : "batches");

export const normalizeAppPath = (pathname: string): string =>
  pathname.replace(/^\/_layout/, "").replace(/\/+$/, "") || "/";

export const isGrpoCreateFlowPath = (pathname: string): boolean => {
  const path = normalizeAppPath(pathname);
  return path === "/purchase/create-grpo";
};

export const pickGrpoCreateSearch = (
  search?: Record<string, unknown> | GrpoCreateSearch | null,
): GrpoCreateSearch => {
  if (!search) {
    return {};
  }
  const next: GrpoCreateSearch = {};
  const sourceDocNum = String(search.sourceDocNum ?? "").trim();
  const draftDocNum = String(search.draftDocNum ?? "").trim();
  const draftDocEntry = String(search.draftDocEntry ?? "").trim();
  if (sourceDocNum) {
    next.sourceDocNum = sourceDocNum;
  }
  if (search.sourceDocType === "PurchaseOrder") {
    next.sourceDocType = search.sourceDocType;
  }
  if (draftDocNum) {
    next.draftDocNum = draftDocNum;
  }
  if (draftDocEntry) {
    next.draftDocEntry = draftDocEntry;
  }
  return next;
};

export const grpoCreateReturnTarget = (
  returnTo?: LotSetupReturnTo | null,
): { search: GrpoCreateSearch; to: "/purchase/create-grpo" } => ({
  search: pickGrpoCreateSearch(returnTo?.search),
  to: "/purchase/create-grpo",
});

export const grpoLotDocLabel = (input: {
  docNum?: string | undefined;
  draftDocNum?: string | undefined;
}): string => {
  const labeled = String(input.docNum ?? input.draftDocNum ?? "").trim();
  if (labeled) {
    return labeled;
  }
  return "New";
};

export const lotNumbersPreview = (row: ProductRow, kind: LotSetupKind): string => {
  if (kind === "batches") {
    return (row.batchNumbers ?? [])
      .map((batch) => batch.batchNumber.trim())
      .filter(Boolean)
      .join(", ");
  }
  return (row.serialNumbers ?? [])
    .map((serial) => serial.internalSerialNumber.trim())
    .filter(Boolean)
    .join(", ");
};

export const shouldPreserveGrpoCreateDraft = (input: {
  hasLines: boolean;
  chrome?: unknown;
  continueSubmit?: boolean;
  pendingAction?: string | null;
  returnTo?: LotSetupReturnTo | null;
}): boolean =>
  input.hasLines &&
  Boolean(input.returnTo || input.pendingAction || input.continueSubmit || input.chrome);

export const GRPO_CREATE_LOT_ACTIONS = ["save-new", "view", "close", "draft"] as const;

export const shouldOpenGrpoLotSetup = (_isEditMode: boolean, action: string): boolean =>
  (GRPO_CREATE_LOT_ACTIONS as readonly string[]).includes(action) || action === "update";

export const resolveGrpoLotIntercept = (input: {
  action: string;
  confirmed: { batchesConfirmed: boolean; serialsConfirmed: boolean };
  isEditMode: boolean;
  rows: ProductRow[];
}): { kind: LotSetupKind; rowId?: string | undefined; type: "open-modal" } | { type: "submit" } => {
  if (!shouldOpenGrpoLotSetup(input.isEditMode, input.action)) {
    return { type: "submit" };
  }
  if (input.isEditMode && firstRequiredLotError(input.rows) === null) {
    return { type: "submit" };
  }
  const step = resolveLotSetupStep(input.rows, input.confirmed);
  if (step === "submit") {
    return { type: "submit" };
  }
  const managed = lotManagedRows(input.rows, step).filter((r) => lineNeededQty(r) > 0);
  const unallocated = managed.find((r) => Boolean(lotAllocationError(r, true)));
  return {
    kind: step,
    rowId: (unallocated ?? managed[0])?.id,
    type: "open-modal",
  };
};

export const resolveLotSetupAfterOk = (input: {
  confirmed: { batchesConfirmed: boolean; serialsConfirmed: boolean };
  hasPendingCreateAction: boolean;
  kind: LotSetupKind;
  rows: ProductRow[];
}): { kind: LotSetupKind; type: "next" } | { type: "continue-submit" } | { type: "return" } => {
  const next = resolveLotSetupStep(input.rows, {
    batchesConfirmed: input.kind === "batches" ? true : input.confirmed.batchesConfirmed,
    serialsConfirmed: input.kind === "serials" ? true : input.confirmed.serialsConfirmed,
  });
  if (next !== "submit" && input.hasPendingCreateAction) {
    return { kind: next, type: "next" };
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
