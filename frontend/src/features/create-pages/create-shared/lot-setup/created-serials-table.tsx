import { Plus, Trash2 } from "lucide-react";

import { LotBinCell } from "@/features/create-pages/create-shared/lot-setup/lot-bin-cell";
import { LotExpiryDateCell } from "@/features/create-pages/create-shared/lot-setup/lot-expiry-date-cell";
import {
  lineNeededQty,
  type SerialAutoFillInput,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import { SerialAutoFillPopover } from "@/features/create-pages/create-shared/lot-setup/serial-auto-fill-popover";
import { allocatedSerialCount } from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import type {
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";

interface CreatedSerialsTableProps {
  binRequired: boolean;
  onAddSplit: () => void;
  onAutoFill: (input: Omit<SerialAutoFillInput, "count">) => boolean;
  onChange: (index: number, patch: Partial<ProductSerialAllocation>) => void;
  onRemove: (index: number) => void;
  row: ProductRow | null;
}

export function CreatedSerialsTable({
  binRequired,
  onAddSplit,
  onAutoFill,
  onChange,
  onRemove,
  row,
}: CreatedSerialsTableProps) {
  const serials = row?.serialNumbers ?? [];
  const needed = row ? lineNeededQty(row) : 0;
  const remaining = Math.max(0, needed - allocatedSerialCount(serials));
  const canAdd = Boolean(row) && serials.length < needed;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-linen-200">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[40rem] table-fixed text-left text-sm text-ink-900">
          <caption className="sr-only">Created serial numbers</caption>
          <thead className="sticky top-0 z-10 bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="w-8 px-2 py-1.5" scope="col">
                #
              </th>
              <th className="w-[28%] px-2 py-1.5" scope="col">
                Serial No.
              </th>
              <th className="w-[10%] px-2 py-1.5 text-center" scope="col">
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
            {serials.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-center text-sm text-neutral-400" colSpan={6}>
                  {row
                    ? "No serials yet — one empty row is created per Needed qty."
                    : "Select a row above to manage its serial number allocation."}
                </td>
              </tr>
            ) : null}
            {serials.map((serial, index) => (
              <tr
                key={`${row?.id ?? ""}:${String(index)}`}
                className="cursor-pointer border-t border-linen-100 transition-colors hover:bg-linen-50"
              >
                <td className="px-2 py-1 text-xs text-neutral-400">{index + 1}</td>
                <td className="px-2 py-1">
                  <input
                    aria-label={`Serial number ${index + 1}`}
                    className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-sm outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-100"
                    maxLength={36}
                    onChange={(event) =>
                      onChange(index, { internalSerialNumber: event.target.value })
                    }
                    placeholder="Serial number"
                    value={serial.internalSerialNumber}
                  />
                </td>
                {/* Qty is always 1 for serials — read-only display */}
                <td className="px-2 py-1 text-center">
                  <span className="inline-flex h-8 w-full items-center justify-center rounded-md border border-linen-100 bg-linen-50 text-sm font-medium text-neutral-500">
                    1
                  </span>
                </td>
                <td className="px-2 py-1">
                  <LotBinCell
                    binAbsEntry={serial.binAbsEntry}
                    binCode={serial.binCode}
                    onChange={(bin) => onChange(index, bin)}
                    warehouseCode={row?.warehouseCode ?? ""}
                  />
                </td>
                <td className="px-2 py-1">
                  <LotExpiryDateCell
                    ariaLabel={`Serial expiry date ${index + 1}`}
                    onChange={(expiryDate) => onChange(index, { expiryDate })}
                    value={serial.expiryDate}
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    aria-label={`Remove serial ${index + 1}`}
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
            : remaining > 0
              ? `${remaining} serial${remaining === 1 ? "" : "s"} still needed`
              : serials.length > 0
                ? `${serials.length} serials — no extra rows`
                : "Serial rows match Needed qty"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <SerialAutoFillPopover
            count={serials.length}
            disabled={!row || serials.length === 0}
            onFill={onAutoFill}
          />
          <button
            aria-label="Add serial"
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-400 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:cursor-not-allowed disabled:border-linen-200 disabled:bg-linen-100 disabled:text-neutral-400 disabled:shadow-none"
            disabled={!canAdd}
            onClick={onAddSplit}
            type="button"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" />
            Add serial
          </button>
        </div>
      </div>
    </div>
  );
}
