import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import type {
  ProductBatchAllocation,
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";

/** Letters, digits, and hyphen (e.g. abc-1). */
export const LOT_NUMBER_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export type LotAllocationMode = "enter" | "select";

export type SapBinAllocation = {
  BinAbsEntry: number;
  Quantity: number;
  SerialAndBatchNumbersBaseLine: number;
};

export type SapLotCollections = {
  BatchNumbers?: Array<{
    AddmisionDate?: string;
    BatchNumber: string;
    ExpiryDate?: string;
    ManufacturingDate?: string;
    Notes?: string;
    Quantity: number;
  }>;
  DocumentLinesBinAllocations?: SapBinAllocation[];
  SerialNumbers?: Array<{
    ExpiryDate?: string;
    InternalSerialNumber: string;
    ManufacturerSerialNumber?: string;
    Quantity?: number;
  }>;
};

export const isAlphanumericLotNumber = (value: string): boolean =>
  LOT_NUMBER_PATTERN.test(value.trim());

export const sanitizeLotNumberInput = (value: string): string =>
  value.replaceAll(/[^A-Za-z0-9-]/g, "").slice(0, 36);

export const isBatchManaged = (row: Pick<ProductRow, "manBtchNum">): boolean =>
  String(row.manBtchNum ?? "").toUpperCase() === "Y";

export const isSerialManaged = (row: Pick<ProductRow, "manSerNum">): boolean =>
  String(row.manSerNum ?? "").toUpperCase() === "Y";

export const isLotManaged = (row: Pick<ProductRow, "manBtchNum" | "manSerNum">): boolean =>
  isBatchManaged(row) || isSerialManaged(row);

export const hasLotAllocations = (row: ProductRow): boolean => {
  if (isBatchManaged(row)) {
    return (row.batchNumbers?.length ?? 0) > 0;
  }
  if (isSerialManaged(row)) {
    return (row.serialNumbers?.length ?? 0) > 0;
  }
  return false;
};

export const lotFieldsFromProduct = (
  product: Pick<ProductLookupItem, "manBtchNum" | "manSerNum">,
): Pick<ProductRow, "batchNumbers" | "manBtchNum" | "manSerNum" | "serialNumbers"> => ({
  batchNumbers: [],
  manBtchNum: product.manBtchNum === "Y" ? "Y" : "N",
  manSerNum: product.manSerNum === "Y" ? "Y" : "N",
  serialNumbers: [],
});

export const allocatedBatchQuantity = (rows: ProductBatchAllocation[] | undefined): number => {
  if (!rows?.length) {
    return 0;
  }
  let total = 0;
  for (const row of rows) {
    const qty = Number(row.quantity);
    if (Number.isFinite(qty) && qty > 0) {
      total += qty;
    }
  }
  return total;
};

export const allocatedSerialCount = (rows: ProductSerialAllocation[] | undefined): number => {
  if (!rows?.length) {
    return 0;
  }
  return rows.filter((row) => row.internalSerialNumber.trim()).length;
};

export const lotAllocationError = (row: ProductRow, required: boolean): string | null => {
  if (!isLotManaged(row)) {
    return null;
  }
  const lineQty = Number(row.quantity);
  const expectedQty = Number.isFinite(lineQty) && lineQty > 0 ? lineQty : 0;
  const productLabel = row.productCode || "item";

  if (isBatchManaged(row)) {
    const batches = row.batchNumbers ?? [];
    if (batches.length === 0) {
      return required ? `Enter batch numbers for ${productLabel}.` : null;
    }
    for (const batch of batches) {
      const number = batch.batchNumber.trim();
      if (!number) {
        return `Batch number is required for ${productLabel}.`;
      }
      if (!isAlphanumericLotNumber(number)) {
        return `Batch ${number} on ${productLabel} may use letters, numbers, and hyphen.`;
      }
      const qty = Number(batch.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return `Batch ${number} on ${productLabel} needs a quantity greater than 0.`;
      }
    }
    const allocated = allocatedBatchQuantity(batches);
    if (expectedQty > 0 && Math.abs(allocated - expectedQty) > 0.0001) {
      return `Batch quantity for ${productLabel} must equal line quantity (${expectedQty}).`;
    }
    return null;
  }

  const serials = row.serialNumbers ?? [];
  if (serials.length === 0) {
    return required ? `Enter serial numbers for ${productLabel}.` : null;
  }
  const seen = new Set<string>();
  for (const serial of serials) {
    const number = serial.internalSerialNumber.trim();
    if (!number) {
      return `Serial number is required for ${productLabel}.`;
    }
    if (!isAlphanumericLotNumber(number)) {
      return `Serial ${number} on ${productLabel} may use letters, numbers, and hyphen.`;
    }
    if (seen.has(number)) {
      return `Serial ${number} is duplicated on ${productLabel}.`;
    }
    seen.add(number);
    const manufacturer = serial.manufacturerSerialNumber?.trim() ?? "";
    if (manufacturer && !isAlphanumericLotNumber(manufacturer)) {
      return `Manufacturer serial on ${productLabel} may use letters, numbers, and hyphen.`;
    }
  }
  if (expectedQty > 0 && allocatedSerialCount(serials) !== expectedQty) {
    return `Select ${expectedQty} serial numbers for ${productLabel}.`;
  }
  return null;
};

export const firstRequiredLotError = (rows: ProductRow[]): string | null => {
  for (const row of rows) {
    const error = lotAllocationError(row, true);
    if (error) {
      return error;
    }
  }
  return null;
};

const sapBinAllocationsFromLots = (
  lots: Array<{ binAbsEntry?: number | undefined; quantity?: number | undefined }>,
): SapBinAllocation[] => {
  const allocations: SapBinAllocation[] = [];
  for (const [index, lot] of lots.entries()) {
    const binAbsEntry = Number(lot.binAbsEntry);
    const quantity = Number(lot.quantity ?? 1);
    if (!Number.isFinite(binAbsEntry) || binAbsEntry <= 0) {
      continue;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }
    allocations.push({
      BinAbsEntry: Math.trunc(binAbsEntry),
      Quantity: quantity,
      SerialAndBatchNumbersBaseLine: index,
    });
  }
  return allocations;
};

export const sapLotFieldsFromRow = (
  row: Pick<ProductRow, "batchNumbers" | "manBtchNum" | "manSerNum" | "serialNumbers">,
): SapLotCollections => {
  if (isBatchManaged(row) && (row.batchNumbers?.length ?? 0) > 0) {
    const batches = row.batchNumbers ?? [];
    const binAllocations = sapBinAllocationsFromLots(batches);
    return {
      BatchNumbers: batches.map((batch) => ({
        BatchNumber: batch.batchNumber.trim(),
        Quantity: Number(batch.quantity),
        ...(batch.admissionDate ? { AddmisionDate: batch.admissionDate } : {}),
        ...(batch.expiryDate ? { ExpiryDate: batch.expiryDate } : {}),
        ...(batch.manufacturingDate ? { ManufacturingDate: batch.manufacturingDate } : {}),
        ...(batch.notes ? { Notes: batch.notes } : {}),
      })),
      ...(binAllocations.length > 0 ? { DocumentLinesBinAllocations: binAllocations } : {}),
    };
  }
  if (isSerialManaged(row) && (row.serialNumbers?.length ?? 0) > 0) {
    const serials = row.serialNumbers ?? [];
    const binAllocations = sapBinAllocationsFromLots(
      serials.map((serial) => ({
        binAbsEntry: serial.binAbsEntry,
        quantity: 1,
      })),
    );
    return {
      SerialNumbers: serials.map((serial) => ({
        InternalSerialNumber: serial.internalSerialNumber.trim(),
        Quantity: 1,
        ...(serial.expiryDate ? { ExpiryDate: serial.expiryDate } : {}),
        ...(serial.manufacturerSerialNumber
          ? { ManufacturerSerialNumber: serial.manufacturerSerialNumber.trim() }
          : {}),
      })),
      ...(binAllocations.length > 0 ? { DocumentLinesBinAllocations: binAllocations } : {}),
    };
  }
  return {};
};

export const lotButtonLabel = (row: Pick<ProductRow, "manBtchNum" | "manSerNum">): string => {
  if (isBatchManaged(row)) {
    return "Batch";
  }
  if (isSerialManaged(row)) {
    return "Serial";
  }
  return "";
};

const sapIsoDate = (value: unknown): string | undefined => {
  const text = String(value ?? "")
    .trim()
    .slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
};

const sapBinByIndex = (
  line: Record<string, unknown>,
): Map<number, { binAbsEntry: number; quantity: number }> => {
  const raw = line.DocumentLinesBinAllocations;
  const bins = new Map<number, { binAbsEntry: number; quantity: number }>();
  if (!Array.isArray(raw)) {
    return bins;
  }
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const index = Number(record.SerialAndBatchNumbersBaseLine);
    const binAbsEntry = Number(record.BinAbsEntry);
    const quantity = Number(record.Quantity);
    if (!Number.isFinite(index) || index < 0) {
      continue;
    }
    if (!Number.isFinite(binAbsEntry) || binAbsEntry <= 0) {
      continue;
    }
    bins.set(index, {
      binAbsEntry: Math.trunc(binAbsEntry),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    });
  }
  return bins;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

/** Map Service Layer batch/serial collections onto create-page allocations. */
export const lotAllocationsFromSapLine = (
  line: unknown,
): {
  batchNumbers: ProductBatchAllocation[];
  serialNumbers: ProductSerialAllocation[];
} => {
  const record = asRecord(line);
  if (!record) {
    return { batchNumbers: [], serialNumbers: [] };
  }
  const bins = sapBinByIndex(record);
  const rawBatches = record.BatchNumbers;
  const batchNumbers: ProductBatchAllocation[] = [];
  if (Array.isArray(rawBatches)) {
    for (const [index, item] of rawBatches.entries()) {
      const batch = asRecord(item);
      if (!batch) {
        continue;
      }
      const batchNumber = String(batch.BatchNumber ?? batch.batchNumber ?? "").trim();
      const quantity = Number(batch.Quantity ?? batch.quantity);
      if (!batchNumber || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }
      const bin = bins.get(index);
      const admissionDate = sapIsoDate(batch.AddmisionDate ?? batch.AdmissionDate);
      const expiryDate = sapIsoDate(batch.ExpiryDate);
      const manufacturingDate = sapIsoDate(batch.ManufacturingDate);
      const notes = String(batch.Notes ?? "").trim();
      batchNumbers.push({
        batchNumber,
        quantity,
        ...(bin ? { binAbsEntry: bin.binAbsEntry } : {}),
        ...(admissionDate ? { admissionDate } : {}),
        ...(expiryDate ? { expiryDate } : {}),
        ...(manufacturingDate ? { manufacturingDate } : {}),
        ...(notes ? { notes } : {}),
      });
    }
  }

  const rawSerials = record.SerialNumbers;
  const serialNumbers: ProductSerialAllocation[] = [];
  if (Array.isArray(rawSerials)) {
    for (const [index, item] of rawSerials.entries()) {
      const serial = asRecord(item);
      if (!serial) {
        continue;
      }
      const internalSerialNumber = String(
        serial.InternalSerialNumber ?? serial.internalSerialNumber ?? "",
      ).trim();
      if (!internalSerialNumber) {
        continue;
      }
      const bin = bins.get(index);
      const manufacturer = String(
        serial.ManufacturerSerialNumber ?? serial.manufacturerSerialNumber ?? "",
      ).trim();
      serialNumbers.push({
        internalSerialNumber,
        quantity: 1,
        ...(bin ? { binAbsEntry: bin.binAbsEntry } : {}),
        ...(sapIsoDate(serial.ExpiryDate) ? { expiryDate: sapIsoDate(serial.ExpiryDate) } : {}),
        ...(manufacturer ? { manufacturerSerialNumber: manufacturer } : {}),
      });
    }
  }

  return { batchNumbers, serialNumbers };
};

export const hydrateRowLotFields = (
  row: ProductRow,
  product: Pick<ProductLookupItem, "manBtchNum" | "manSerNum"> | undefined,
  sapLine?: unknown,
): ProductRow => {
  const flags = product
    ? lotFieldsFromProduct(product)
    : {
        batchNumbers: row.batchNumbers ?? [],
        manBtchNum: row.manBtchNum,
        manSerNum: row.manSerNum,
        serialNumbers: row.serialNumbers ?? [],
      };
  const fromSap = lotAllocationsFromSapLine(sapLine);
  return {
    ...row,
    ...flags,
    batchNumbers: fromSap.batchNumbers.length > 0 ? fromSap.batchNumbers : flags.batchNumbers,
    serialNumbers: fromSap.serialNumbers.length > 0 ? fromSap.serialNumbers : flags.serialNumbers,
  };
};

export const lotAllocationsSnapshot = (rows: ProductRow[]): string =>
  JSON.stringify(
    rows.map((row) => ({
      batchNumbers: row.batchNumbers ?? [],
      id: row.id,
      serialNumbers: row.serialNumbers ?? [],
    })),
  );
