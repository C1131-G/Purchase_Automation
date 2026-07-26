import { Calendar as CalendarIcon } from "lucide-react";

import type {
  RfqEditableLine,
  RfqSellerEditableFields,
} from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";
import {
  computeDiscountAmount,
  computeLineNet,
  discountPercentFromAmount,
  parseOptionalNumber,
} from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";

interface RfqLinesTableProps {
  lines: RfqEditableLine[];
  canEdit: boolean;
  onUpdateLine: (lineNum: number, patch: Partial<RfqSellerEditableFields>) => void;
  netTotal: number;
}

const formatMoney = (value: number): string =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

const editableInputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200";

const readOnlyCellClass = "block text-right tabular-nums text-zinc-800";

/**
 * RFQ line grid — seller fill may edit only:
 * quoted qty, unit price, disc %, disc amount, quoted (delivery) date.
 * Immutable: item, description, UoM, warehouse (buyer snapshot).
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
      <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            <th className="px-2 py-2.5">#</th>
            <th className="px-2 py-2.5">Item</th>
            <th className="px-2 py-2.5">Description</th>
            <th className="px-2 py-2.5 text-right">Quoted Qty</th>
            <th className="px-2 py-2.5">UoM</th>
            <th className="px-2 py-2.5">Whse</th>
            <th className="px-2 py-2.5 text-right">Price</th>
            <th className="px-2 py-2.5 text-right">Disc %</th>
            <th className="px-2 py-2.5 text-right">Disc Amount</th>
            <th className="px-2 py-2.5">Quoted Date</th>
            <th className="px-2 py-2.5 text-right">Line Net</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const unitPrice = parseOptionalNumber(line.unitPrice) ?? 0;
            const quantity = parseOptionalNumber(line.quantity) ?? 0;
            const discount = parseOptionalNumber(line.discount) ?? 0;
            const discAmount = computeDiscountAmount(unitPrice, quantity, discount);
            const lineNet = computeLineNet(unitPrice, quantity, discount);

            return (
              <tr
                key={line.rfqLineId || line.lineNum}
                className="border-b border-zinc-50 align-middle last:border-0"
              >
                <td className="px-2 py-2 tabular-nums text-zinc-500">{line.lineNum}</td>
                <td className="px-2 py-2 font-medium text-zinc-900">{line.itemCode || "—"}</td>
                <td
                  className="max-w-[12rem] truncate px-2 py-2 text-zinc-600"
                  title={line.description}
                >
                  {line.description || "—"}
                </td>

                {/* Quoted Qty — seller editable */}
                <td className="px-2 py-2">
                  {canEdit ? (
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) =>
                        onUpdateLine(line.lineNum, { quantity: event.target.value })
                      }
                      className={`${editableInputClass} w-24`}
                      aria-label={`Quoted quantity line ${line.lineNum}`}
                    />
                  ) : (
                    <span className={readOnlyCellClass}>
                      {line.quantity === "" ? "—" : quantity}
                    </span>
                  )}
                </td>

                <td className="px-2 py-2 text-zinc-600">{line.uomCode || "—"}</td>
                <td className="px-2 py-2 text-zinc-600">{line.warehouse || "—"}</td>

                {/* Price — seller editable */}
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
                      className={`${editableInputClass} w-28`}
                      aria-label={`Unit price line ${line.lineNum}`}
                    />
                  ) : (
                    <span className={readOnlyCellClass}>
                      {line.unitPrice === "" ? "—" : formatMoney(unitPrice)}
                    </span>
                  )}
                </td>

                {/* Disc % — seller editable */}
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
                      className={`${editableInputClass} w-20`}
                      aria-label={`Discount percent line ${line.lineNum}`}
                    />
                  ) : (
                    <span className={readOnlyCellClass}>
                      {line.discount === "" ? "—" : discount}
                    </span>
                  )}
                </td>

                {/* Disc Amount — derived; editing sets disc % */}
                <td className="px-2 py-2">
                  {canEdit ? (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={
                        unitPrice > 0 && quantity > 0
                          ? String(discAmount)
                          : line.discount === ""
                            ? ""
                            : String(discAmount)
                      }
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw.trim() === "") {
                          onUpdateLine(line.lineNum, { discount: "" });
                          return;
                        }
                        const amount = Number(raw);
                        if (!Number.isFinite(amount)) {
                          return;
                        }
                        const percent = discountPercentFromAmount(unitPrice, quantity, amount);
                        if (percent === null) {
                          return;
                        }
                        onUpdateLine(line.lineNum, { discount: String(percent) });
                      }}
                      className={`${editableInputClass} w-28`}
                      aria-label={`Discount amount line ${line.lineNum}`}
                      title="Updates discount percent from amount"
                    />
                  ) : (
                    <span className={readOnlyCellClass}>
                      {discount > 0 || discAmount > 0 ? formatMoney(discAmount) : "—"}
                    </span>
                  )}
                </td>

                {/* Quoted Date — seller editable */}
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
                        aria-label={`Quoted date line ${line.lineNum}`}
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
              colSpan={10}
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
