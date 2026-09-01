import { Maximize2, Minimize2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/input/input";
import { LotBinCell } from "@/features/create-pages/create-shared/lot-setup/lot-bin-cell";
import { LotExpiryDateCell } from "@/features/create-pages/create-shared/lot-setup/lot-expiry-date-cell";
import { LOT_TEXT_FIELD_CLASS } from "@/features/create-pages/create-shared/lot-setup/lot-field-styles";
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
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fullscreenToggleRef = useRef<HTMLButtonElement>(null);
  const wasFullscreenRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const element = fullscreenRef.current;
    if (!element || typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      // Keep the inline serial table usable if fullscreen permission is denied.
    }
  }, []);

  useEffect(function syncSerialTableFullscreenState() {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === fullscreenRef.current;
      setIsFullscreen(active);
      if (wasFullscreenRef.current && !active) {
        fullscreenToggleRef.current?.focus();
      }
      wasFullscreenRef.current = active;
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return function removeSerialTableFullscreenListener() {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div
      ref={fullscreenRef}
      className={
        isFullscreen
          ? "flex h-[100dvh] min-h-0 w-full flex-col overflow-visible bg-surface p-3"
          : "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-linen-200"
      }
    >
      <div className="flex shrink-0 justify-end border-b border-linen-100 bg-surface px-2 py-1">
        <button
          ref={fullscreenToggleRef}
          aria-label={isFullscreen ? "Minimize serial table" : "Maximize serial table"}
          aria-pressed={isFullscreen}
          className="inline-flex min-h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-linen-200 bg-white px-2 text-ink-700 shadow-sm transition-colors hover:bg-linen-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          onClick={toggleFullscreen}
          type="button"
        >
          {isFullscreen ? (
            <Minimize2 aria-hidden="true" className="size-4" />
          ) : (
            <Maximize2 aria-hidden="true" className="size-4" />
          )}
          <span className="sr-only">
            {isFullscreen ? "Minimize serial table" : "Maximize serial table"}
          </span>
        </button>
      </div>
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
                  <Input
                    aria-label={`Serial number ${index + 1}`}
                    className={LOT_TEXT_FIELD_CLASS}
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
                  <span className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-linen-200 bg-field-silver text-sm font-medium text-neutral-500">
                    1
                  </span>
                </td>
                <td className="px-2 py-1">
                  <LotBinCell
                    binAbsEntry={serial.binAbsEntry}
                    binCode={serial.binCode}
                    onChange={(bin) => onChange(index, bin)}
                    portalContainer={isFullscreen ? fullscreenRef.current : undefined}
                    warehouseCode={row?.warehouseCode ?? ""}
                  />
                </td>
                <td className="px-2 py-1">
                  <LotExpiryDateCell
                    ariaLabel={`Serial expiry date ${index + 1}`}
                    onChange={(expiryDate) => onChange(index, { expiryDate })}
                    portalContainer={isFullscreen ? fullscreenRef.current : undefined}
                    value={serial.expiryDate}
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    aria-label={`Remove serial ${index + 1}`}
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition hover:bg-rose-50 hover:text-danger"
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
            className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-2.5 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-400 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:cursor-not-allowed disabled:border-linen-200 disabled:bg-linen-100 disabled:text-neutral-400 disabled:shadow-none"
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
