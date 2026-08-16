import { Plus, Split, Trash2 } from "lucide-react";

import { LotBinCell } from "@/features/create-pages/create-shared/lot-setup/lot-bin-cell";
import { LotExpiryDateCell } from "@/features/create-pages/create-shared/lot-setup/lot-expiry-date-cell";
import { LotQtyInput } from "@/features/create-pages/create-shared/lot-setup/lot-qty-input";
import {
  lineNeededQty,
  type SerialAutoFillInput,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import { SerialAutoFillPopover } from "@/features/create-pages/create-shared/lot-setup/serial-auto-fill-popover";
import type {
  ProductBatchAllocation,
  ProductRow,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { allocatedBatchQuantity } from "@/features/create-pages/create-shared/utils/product-lot-allocations";

interface CreatedBatchesTableProps {
  binRequired: boolean;
  onAddSplit: () => void;
  onAutoFill: (input: Omit<SerialAutoFillInput, "count">) => boolean;
  onChange: (index: number, patch: Partial<ProductBatchAllocation>) => void;
  onRemove: (index: number) => void;
  row: ProductRow | null;
}

export function CreatedBatchesTable({
  binRequired,
  onAddSplit,
  onAutoFill,
  onChange,
  onRemove,
  row,
}: CreatedBatchesTableProps) {
  const batches = row?.batchNumbers ?? [];
  const needed = row ? lineNeededQty(row) : 0;
  const remaining = Math.max(0, needed - allocatedBatchQuantity(batches));
  const canSplit = Boolean(row) && (batches.length === 0 || remaining > 0);
  const splitLabel =
    batches.length === 0
      ? "Add batch"
      : remaining > 0
        ? `Split remaining ${remaining}`
        : "Split batch";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-linen-200">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[40rem] table-fixed text-left text-sm text-ink-900">
          <caption className="sr-only">Created batches</caption>
          <thead className="sticky top-0 z-10 bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="w-8 px-2 py-1.5" scope="col">
                #
              </th>
              <th className="w-[26%] px-2 py-1.5" scope="col">
                Batch No.
              </th>
              <th className="w-[12%] px-2 py-1.5" scope="col">
                Qty
              </th>
              <th className="w-[24%] px-2 py-1.5" scope="col">
                Bin Location{binRequired ? <span className="ml-0.5 text-danger">*</span> : null}
              </th>
              <th className="w-[18%] px-2 py-1.5" scope="col">
                Expiry Date
              </th>
              <th className="w-10 px-2 py-1.5" scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-center text-sm text-neutral-400" colSpan={6}>
                  {row
                    ? 'No batches yet — click "Add batch" below to start.'
                    : "Select a row above to manage its batch allocation."}
                </td>
              </tr>
            ) : null}
            {batches.map((batch, index) => (
              <tr
                key={`${row?.id ?? ""}:${String(index)}`}
                className="cursor-pointer border-t border-linen-100 transition-colors hover:bg-linen-50"
              >
                <td className="px-2 py-1 text-xs text-neutral-400">{index + 1}</td>
                <td className="px-2 py-1">
                  <input
                    aria-label={`Batch number ${index + 1}`}
                    className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-sm outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-100"
                    maxLength={36}
                    onChange={(event) => onChange(index, { batchNumber: event.target.value })}
                    placeholder="ddmmyyyy"
                    value={batch.batchNumber}
                  />
                </td>
                <td className="px-2 py-1">
                  <LotQtyInput
                    ariaLabel={`Batch quantity ${index + 1}`}
                    className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-sm outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-100"
                    min={0}
                    onCommit={(quantity) => onChange(index, { quantity })}
                    value={batch.quantity}
                  />
                </td>
                <td className="px-2 py-1">
                  <LotBinCell
                    binAbsEntry={batch.binAbsEntry}
                    binCode={batch.binCode}
                    onChange={(bin) => onChange(index, bin)}
                    warehouseCode={row?.warehouseCode ?? ""}
                  />
                </td>
                <td className="px-2 py-1">
                  <LotExpiryDateCell
                    ariaLabel={`Batch expiry date ${index + 1}`}
                    onChange={(expiryDate) => onChange(index, { expiryDate })}
                    value={batch.expiryDate}
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    aria-label={`Remove batch ${index + 1}`}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition hover:bg-rose-50 hover:text-danger"
                    onClick={() => onRemove(index)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-linen-100 bg-linen-50/90 px-2 py-1.5">
        <p className="min-w-0 truncate text-xs text-neutral-500">
          {!row
            ? "Select a document row"
            : batches.length === 0
              ? "Add a batch to start"
              : remaining > 0
                ? `${remaining} still open — split to add`
                : null}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <SerialAutoFillPopover
            count={batches.length}
            disabled={!row || batches.length === 0}
            onFill={onAutoFill}
            title="Auto fill batches"
          />
          <button
            aria-label={splitLabel}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-400 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:cursor-not-allowed disabled:border-linen-200 disabled:bg-linen-100 disabled:text-neutral-400 disabled:shadow-none"
            disabled={!canSplit}
            onClick={onAddSplit}
            type="button"
          >
            {batches.length === 0 ? (
              <Plus aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <Split aria-hidden className="h-3.5 w-3.5" />
            )}
            {splitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
