import { Calendar as CalendarIcon } from "lucide-react";

import type { RfqEditableLine } from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";
import {
  computeLineNet,
  parseOptionalNumber,
} from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";

interface RfqLinesTableProps {
  lines: RfqEditableLine[];
  canEdit: boolean;
  onUpdateLine: (
    lineNum: number,
    patch: Partial<Pick<RfqEditableLine, "unitPrice" | "discount" | "deliveryDate">>,
  ) => void;
  netTotal: number;
}

const formatMoney = (value: number): string =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

/**
 * RFQ line grid — mirrors Purchase Quotation product table chrome.
 * Editable: unit price, discount %, delivery date (seller fill only).
 * Immutable: item, qty, warehouse, UoM (buyer snapshot).
 */
export function RfqLinesTable({ lines, canEdit, onUpdateLine, netTotal }: RfqLinesTableProps) {
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        No lines on this Request For Quotation.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto px-1 py-1">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            <th className="px-2 py-2.5">#</th>
            <th className="px-2 py-2.5">Item</th>
            <th className="px-2 py-2.5">Description</th>
            <th className="px-2 py-2.5 text-right">Qty</th>
            <th className="px-2 py-2.5">UoM</th>
            <th className="px-2 py-2.5">Whse</th>
            <th className="px-2 py-2.5 text-right">Unit Price</th>
            <th className="px-2 py-2.5 text-right">Disc %</th>
            <th className="px-2 py-2.5">Delivery</th>
            <th className="px-2 py-2.5 text-right">Line Net</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const unitPrice = parseOptionalNumber(line.unitPrice) ?? 0;
            const discount = parseOptionalNumber(line.discount) ?? 0;
            const lineNet = computeLineNet(unitPrice, line.quantity, discount);

            return (
              <tr
                key={line.rfqLineId || line.lineNum}
                className="border-b border-zinc-50 align-middle last:border-0"
              >
                <td className="px-2 py-2 tabular-nums text-zinc-500">{line.lineNum}</td>
                <td className="px-2 py-2 font-medium text-zinc-900">{line.itemCode || "—"}</td>
                <td
                  className="max-w-[14rem] truncate px-2 py-2 text-zinc-600"
                  title={line.description}
                >
                  {line.description || "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-zinc-800">{line.quantity}</td>
                <td className="px-2 py-2 text-zinc-600">{line.uomCode || "—"}</td>
                <td className="px-2 py-2 text-zinc-600">{line.warehouse || "—"}</td>
                <td className="px-2 py-2">
                  {canEdit ? (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(event) =>
                        onUpdateLine(line.lineNum, { unitPrice: event.target.value })
                      }
                      className="w-28 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                      aria-label={`Unit price line ${line.lineNum}`}
                    />
                  ) : (
                    <span className="block text-right tabular-nums text-zinc-800">
                      {line.unitPrice === "" ? "—" : formatMoney(unitPrice)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {canEdit ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      inputMode="decimal"
                      value={line.discount}
                      onChange={(event) =>
                        onUpdateLine(line.lineNum, { discount: event.target.value })
                      }
                      className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                      aria-label={`Discount line ${line.lineNum}`}
                    />
                  ) : (
                    <span className="block text-right tabular-nums text-zinc-800">
                      {line.discount === "" ? "—" : discount}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {canEdit ? (
                    <label className="relative inline-flex items-center">
                      <CalendarIcon
                        className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-zinc-400"
                        aria-hidden
                      />
                      <input
                        type="date"
                        value={line.deliveryDate}
                        onChange={(event) =>
                          onUpdateLine(line.lineNum, { deliveryDate: event.target.value })
                        }
                        className="w-[9.5rem] rounded-lg border border-zinc-200 bg-white py-1.5 pl-7 pr-2 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                        aria-label={`Delivery date line ${line.lineNum}`}
                      />
                    </label>
                  ) : (
                    <span className="text-zinc-800">{line.deliveryDate || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right font-medium tabular-nums text-zinc-900">
                  {formatMoney(lineNet)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-100">
            <td
              colSpan={9}
              className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Net total
            </td>
            <td className="px-2 py-3 text-right text-sm font-semibold tabular-nums text-zinc-950">
              {formatMoney(netTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
