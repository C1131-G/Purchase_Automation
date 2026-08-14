import { Plus, Trash2 } from "lucide-react";

import { LotBinCell } from "@/features/create-pages/create-shared/lot-setup/lot-bin-cell";
import type {
  ProductBatchAllocation,
  ProductRow,
} from "@/features/create-pages/create-shared/utils/create-order.types";

interface CreatedBatchesTableProps {
  binRequired: boolean;
  onAddSplit: () => void;
  onChange: (index: number, patch: Partial<ProductBatchAllocation>) => void;
  onRemove: (index: number) => void;
  row: ProductRow | null;
}

export function CreatedBatchesTable({
  binRequired,
  onAddSplit,
  onChange,
  onRemove,
  row,
}: CreatedBatchesTableProps) {
  const batches = row?.batchNumbers ?? [];

  return (
    <div className="overflow-auto rounded-xl border border-linen-200">
      <table className="w-full min-w-[820px] table-fixed text-left text-xs text-ink-900">
        <caption className="sr-only">Created batches</caption>
        <thead className="bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="w-10 px-2 py-2">#</th>
            <th className="w-[22%] px-2 py-2">Batch</th>
            <th className="w-[12%] px-2 py-2">Qty</th>
            {binRequired ? <th className="w-[22%] px-2 py-2">Bin Location</th> : null}
            <th className="w-[18%] px-2 py-2">Expiration Date</th>
            <th className="w-16 px-2 py-2 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {batches.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-neutral-500" colSpan={binRequired ? 6 : 5}>
                Select a document row to create batches.
              </td>
            </tr>
          ) : null}
          {batches.map((batch, index) => (
            <tr key={`batch-${index}`} className="border-t border-linen-100">
              <td className="px-2 py-1.5">{index + 1}</td>
              <td className="px-2 py-1.5">
                <input
                  aria-label={`Batch number ${index + 1}`}
                  className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-xs outline-none focus:border-teal-400 focus:bg-surface"
                  maxLength={36}
                  onChange={(event) => onChange(index, { batchNumber: event.target.value })}
                  value={batch.batchNumber}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  aria-label={`Batch quantity ${index + 1}`}
                  className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-xs outline-none focus:border-teal-400 focus:bg-surface"
                  min={0}
                  onChange={(event) => onChange(index, { quantity: Number(event.target.value) })}
                  step="any"
                  type="number"
                  value={batch.quantity}
                />
              </td>
              {binRequired ? (
                <td className="px-2 py-1.5">
                  <LotBinCell
                    binAbsEntry={batch.binAbsEntry}
                    binCode={batch.binCode}
                    onChange={(bin) => onChange(index, bin)}
                    warehouseCode={row?.warehouseCode ?? ""}
                  />
                </td>
              ) : null}
              <td className="px-2 py-1.5">
                <input
                  aria-label={`Batch expiry ${index + 1}`}
                  className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-xs outline-none focus:border-teal-400 focus:bg-surface"
                  onChange={(event) =>
                    onChange(index, { expiryDate: event.target.value || undefined })
                  }
                  type="date"
                  value={batch.expiryDate ?? ""}
                />
              </td>
              <td className="px-2 py-1.5 text-right">
                <button
                  aria-label={`Remove batch ${index + 1}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-900 hover:bg-linen-50"
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
      {row ? (
        <div className="border-t border-linen-100 px-2 py-2">
          <button
            className="inline-flex h-8 items-center gap-1 text-xs font-medium text-teal-700"
            onClick={onAddSplit}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Split batch
          </button>
        </div>
      ) : null}
    </div>
  );
}
