import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { NumericInput } from "@/components/input/numeric-input";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import type {
  ProductBatchAllocation,
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  allocatedBatchQuantity,
  allocatedSerialCount,
  isAlphanumericLotNumber,
  isBatchManaged,
  isSerialManaged,
  lotAllocationError,
  sanitizeLotNumberInput,
  type LotAllocationMode,
} from "@/features/create-pages/create-shared/utils/product-lot-allocations";

interface ProductLotAllocationModalProps {
  mode: LotAllocationMode;
  onClose: () => void;
  onSave: (patch: Pick<ProductRow, "batchNumbers" | "serialNumbers">) => void;
  open: boolean;
  required: boolean;
  row: ProductRow | null;
}

const emptyBatch = (): ProductBatchAllocation => ({ batchNumber: "", quantity: 0 });
const emptySerial = (): ProductSerialAllocation => ({ internalSerialNumber: "" });

export function ProductLotAllocationModal({
  mode,
  onClose,
  onSave,
  open,
  required,
  row,
}: ProductLotAllocationModalProps) {
  const isBatch = row ? isBatchManaged(row) : false;
  const isSerial = row ? isSerialManaged(row) : false;
  const lineQty = Number(row?.quantity ?? 0);
  const warehouseCode = String(row?.warehouseCode ?? "").trim();
  const itemCode = String(row?.productCode ?? "").trim();

  const [batches, setBatches] = useState<ProductBatchAllocation[]>([]);
  const [serials, setSerials] = useState<ProductSerialAllocation[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const batchesQuery = useQuery({
    ...createSharedQueries.itemBatches(itemCode, warehouseCode),
    enabled: open && mode === "select" && isBatch && Boolean(itemCode && warehouseCode),
  });
  const serialsQuery = useQuery({
    ...createSharedQueries.itemSerials(itemCode, warehouseCode),
    enabled: open && mode === "select" && isSerial && Boolean(itemCode && warehouseCode),
  });

  useEffect(() => {
    if (!open || !row) {
      return;
    }
    setFormError(null);
    if (isBatchManaged(row)) {
      setBatches(
        row.batchNumbers?.length ? row.batchNumbers.map((item) => ({ ...item })) : [emptyBatch()],
      );
      setSerials([]);
      return;
    }
    if (isSerialManaged(row)) {
      const existing = row.serialNumbers?.length
        ? row.serialNumbers.map((item) => ({ ...item }))
        : [];
      if (mode === "enter") {
        const needed = Math.max(1, Number.isFinite(lineQty) ? Math.trunc(lineQty) : 1);
        while (existing.length < needed) {
          existing.push(emptySerial());
        }
      }
      setSerials(existing.length > 0 ? existing : [emptySerial()]);
      setBatches([]);
    }
  }, [lineQty, mode, open, row]);

  const remainingBatchQty = useMemo(
    () => Math.max(0, (Number.isFinite(lineQty) ? lineQty : 0) - allocatedBatchQuantity(batches)),
    [batches, lineQty],
  );
  const remainingSerialCount = useMemo(
    () =>
      Math.max(
        0,
        (Number.isFinite(lineQty) ? Math.trunc(lineQty) : 0) - allocatedSerialCount(serials),
      ),
    [lineQty, serials],
  );

  const title = isBatch ? "Batch numbers" : "Serial numbers";
  const subtitle = row
    ? `${row.productCode} · ${row.productName || "Item"} · qty ${Number.isFinite(lineQty) ? lineQty : 0}`
    : "";

  const handleConfirm = () => {
    if (!row) {
      return;
    }
    const nextRow: ProductRow = {
      ...row,
      batchNumbers: isBatch ? batches.filter((item) => item.batchNumber.trim()) : [],
      serialNumbers: isSerial ? serials.filter((item) => item.internalSerialNumber.trim()) : [],
    };
    const error = lotAllocationError(nextRow, required);
    if (error) {
      setFormError(error);
      return;
    }
    onSave({
      batchNumbers: nextRow.batchNumbers,
      serialNumbers: nextRow.serialNumbers,
    });
    onClose();
  };

  return (
    <AnimatedModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-2xl w-[min(720px,94vw)]"
    >
      <div
        className="flex flex-col gap-4 p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lot-modal-title"
      >
        <div>
          <h2 id="lot-modal-title" className="text-base font-semibold text-ink-900">
            {title}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {mode === "enter"
              ? "Type letters, numbers, and hyphen (for example abc-1). No spaces."
              : "Select existing stock from SAP. Numbers may use letters, digits, and hyphen."}
          </p>
        </div>

        {mode === "select" && !warehouseCode ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Select a warehouse on the line before choosing batch or serial numbers.
          </p>
        ) : null}

        {isBatch && mode === "enter" ? (
          <EnterBatchTable
            batches={batches}
            remaining={remainingBatchQty}
            setBatches={setBatches}
          />
        ) : null}
        {isBatch && mode === "select" ? (
          <SelectBatchTable
            available={batchesQuery.data ?? []}
            batches={batches}
            loading={batchesQuery.isLoading}
            remaining={remainingBatchQty}
            setBatches={setBatches}
          />
        ) : null}
        {isSerial && mode === "enter" ? (
          <EnterSerialTable
            remaining={remainingSerialCount}
            serials={serials}
            setSerials={setSerials}
          />
        ) : null}
        {isSerial && mode === "select" ? (
          <SelectSerialTable
            available={serialsQuery.data ?? []}
            loading={serialsQuery.isLoading}
            remaining={remainingSerialCount}
            serials={serials}
            setSerials={setSerials}
          />
        ) : null}

        {formError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-linen-200 px-4 text-xs font-medium text-ink-900 hover:bg-linen-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-9 rounded-xl bg-teal-600 px-4 text-xs font-semibold text-white hover:bg-teal-700"
          >
            Apply
          </button>
        </div>
      </div>
    </AnimatedModalShell>
  );
}

function EnterBatchTable({
  batches,
  remaining,
  setBatches,
}: {
  batches: ProductBatchAllocation[];
  remaining: number;
  setBatches: (next: ProductBatchAllocation[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-500">Remaining quantity: {remaining}</div>
      <div className="overflow-hidden rounded-xl border border-linen-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-linen-50 text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Batch number</th>
              <th className="w-28 px-3 py-2">Quantity</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {batches.map((batch, index) => (
              <tr key={`batch-enter-${index}`} className="border-t border-linen-100">
                <td className="px-3 py-2">
                  <input
                    aria-label={`Batch number ${index + 1}`}
                    value={batch.batchNumber}
                    onChange={(event) => {
                      const next = [...batches];
                      next[index] = {
                        ...batch,
                        batchNumber: sanitizeLotNumberInput(event.target.value),
                      };
                      setBatches(next);
                    }}
                    maxLength={36}
                    className="h-9 w-full appearance-none rounded-lg border border-linen-200 bg-field-silver px-2 text-ink-900 outline-none transition placeholder:text-neutral-300 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                  />
                </td>
                <td className="px-3 py-2">
                  <NumericInput
                    aria-label={`Batch quantity ${index + 1}`}
                    profile="sapDecimal"
                    value={batch.quantity ? String(batch.quantity) : ""}
                    onValueChange={(value) => {
                      const next = [...batches];
                      next[index] = { ...batch, quantity: Number(value) || 0 };
                      setBatches(next);
                    }}
                    className="h-9 w-full appearance-none rounded-lg border border-linen-200 bg-field-silver px-2 text-ink-900 outline-none transition placeholder:text-neutral-300 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    aria-label="Remove batch row"
                    onClick={() => setBatches(batches.filter((_, rowIndex) => rowIndex !== index))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-900 hover:bg-linen-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setBatches([...batches, emptyBatch()])}
        className="inline-flex h-8 items-center gap-1 self-start text-xs font-medium text-teal-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add batch
      </button>
    </div>
  );
}

function SelectBatchTable({
  available,
  batches,
  loading,
  remaining,
  setBatches,
}: {
  available: Array<{ batchNumber: string; quantity: number }>;
  batches: ProductBatchAllocation[];
  loading: boolean;
  remaining: number;
  setBatches: (next: ProductBatchAllocation[]) => void;
}) {
  const selected = new Map(batches.map((batch) => [batch.batchNumber, batch.quantity]));
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-500">Remaining quantity: {remaining}</div>
      {loading ? <p className="text-xs text-neutral-500">Loading batches…</p> : null}
      {!loading && available.length === 0 ? (
        <p className="text-xs text-neutral-500">No on-hand batches for this item and warehouse.</p>
      ) : null}
      <div className="max-h-64 overflow-auto rounded-xl border border-linen-200">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-linen-50 text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2">Batch</th>
              <th className="w-24 px-3 py-2">Available</th>
              <th className="w-28 px-3 py-2">Take</th>
            </tr>
          </thead>
          <tbody>
            {available.map((item) => {
              const take = selected.get(item.batchNumber) ?? 0;
              const checked = take > 0;
              return (
                <tr key={item.batchNumber} className="border-t border-linen-100">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-label={`Select batch ${item.batchNumber}`}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setBatches([
                            ...batches.filter((batch) => batch.batchNumber !== item.batchNumber),
                            {
                              batchNumber: item.batchNumber,
                              quantity: Math.min(item.quantity, remaining || item.quantity),
                            },
                          ]);
                          return;
                        }
                        setBatches(
                          batches.filter((batch) => batch.batchNumber !== item.batchNumber),
                        );
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-ink-900">{item.batchNumber}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">
                    <NumericInput
                      profile="sapDecimal"
                      disabled={!checked}
                      value={checked ? String(take) : ""}
                      aria-label={`Quantity for ${item.batchNumber}`}
                      onValueChange={(value) => {
                        const qty = Math.min(item.quantity, Math.max(0, Number(value) || 0));
                        setBatches(
                          batches.map((batch) =>
                            batch.batchNumber === item.batchNumber
                              ? { ...batch, quantity: qty }
                              : batch,
                          ),
                        );
                      }}
                      className="h-8 w-full appearance-none rounded-lg border border-linen-200 bg-field-silver px-2 text-ink-900 outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 disabled:opacity-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnterSerialTable({
  remaining,
  serials,
  setSerials,
}: {
  remaining: number;
  serials: ProductSerialAllocation[];
  setSerials: (next: ProductSerialAllocation[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-500">Remaining serials: {remaining}</div>
      <div className="overflow-hidden rounded-xl border border-linen-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-linen-50 text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Serial number</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {serials.map((serial, index) => (
              <tr key={`serial-enter-${index}`} className="border-t border-linen-100">
                <td className="px-3 py-2">
                  <input
                    aria-label={`Serial number ${index + 1}`}
                    value={serial.internalSerialNumber}
                    onChange={(event) => {
                      const next = [...serials];
                      next[index] = {
                        ...serial,
                        internalSerialNumber: sanitizeLotNumberInput(event.target.value),
                      };
                      setSerials(next);
                    }}
                    maxLength={36}
                    className="h-9 w-full appearance-none rounded-lg border border-linen-200 bg-field-silver px-2 text-ink-900 outline-none transition placeholder:text-neutral-300 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    aria-label="Remove serial row"
                    onClick={() => setSerials(serials.filter((_, rowIndex) => rowIndex !== index))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-900 hover:bg-linen-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setSerials([...serials, emptySerial()])}
        className="inline-flex h-8 items-center gap-1 self-start text-xs font-medium text-teal-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add serial
      </button>
    </div>
  );
}

function SelectSerialTable({
  available,
  loading,
  remaining,
  serials,
  setSerials,
}: {
  available: Array<{ internalSerialNumber: string }>;
  loading: boolean;
  remaining: number;
  serials: ProductSerialAllocation[];
  setSerials: (next: ProductSerialAllocation[]) => void;
}) {
  const selected = new Set(serials.map((item) => item.internalSerialNumber));
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-500">Remaining serials: {remaining}</div>
      {loading ? <p className="text-xs text-neutral-500">Loading serials…</p> : null}
      {!loading && available.length === 0 ? (
        <p className="text-xs text-neutral-500">
          No available serials for this item and warehouse.
        </p>
      ) : null}
      <div className="max-h-64 overflow-auto rounded-xl border border-linen-200">
        <ul className="divide-y divide-linen-100">
          {available.map((item) => {
            const checked = selected.has(item.internalSerialNumber);
            return (
              <li
                key={item.internalSerialNumber}
                className="flex items-center gap-2 px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  aria-label={`Select serial ${item.internalSerialNumber}`}
                  onChange={(event) => {
                    if (event.target.checked) {
                      if (!isAlphanumericLotNumber(item.internalSerialNumber)) {
                        return;
                      }
                      setSerials([...serials, { internalSerialNumber: item.internalSerialNumber }]);
                      return;
                    }
                    setSerials(
                      serials.filter(
                        (serial) => serial.internalSerialNumber !== item.internalSerialNumber,
                      ),
                    );
                  }}
                />
                <span className="font-medium text-ink-900">{item.internalSerialNumber}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
