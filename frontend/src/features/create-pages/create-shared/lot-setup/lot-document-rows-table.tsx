import type { LotSetupKind } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import {
  createdQtyForKind,
  lineNeededQty,
  openQtyForKind,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

interface LotDocumentRowsTableProps {
  activeRowId: string | null;
  docLabel: string;
  kind: LotSetupKind;
  onSelectRow: (rowId: string) => void;
  onNeededQtyChange: (rowId: string, quantity: number) => void;
  rows: ProductRow[];
  warehouseNameByCode: Map<string, string>;
}

export function LotDocumentRowsTable({
  activeRowId,
  docLabel,
  kind,
  onNeededQtyChange,
  onSelectRow,
  rows,
  warehouseNameByCode,
}: LotDocumentRowsTableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-linen-200">
      <table className="w-full min-w-[960px] table-fixed text-left text-xs text-ink-900">
        <caption className="sr-only">Rows from documents</caption>
        <thead className="bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="w-10 px-2 py-2">#</th>
            <th className="w-[12%] px-2 py-2">Doc. No.</th>
            <th className="w-[14%] px-2 py-2">Item Number</th>
            <th className="px-2 py-2">Item Description</th>
            <th className="w-[10%] px-2 py-2">Whse Code</th>
            {kind === "serials" ? <th className="w-[16%] px-2 py-2">Whse Name</th> : null}
            <th className="w-[10%] px-2 py-2">Total Needed</th>
            <th className="w-[10%] px-2 py-2">Total Created</th>
            {kind === "serials" ? <th className="w-[10%] px-2 py-2">Open Qty</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-6 text-center text-neutral-500"
                colSpan={kind === "serials" ? 9 : 7}
              >
                No {kind === "serials" ? "serial" : "batch"}-managed lines on this GRPO.
              </td>
            </tr>
          ) : null}
          {rows.map((row, index) => {
            const selected = row.id === activeRowId;
            return (
              <tr
                key={row.id}
                className={`cursor-pointer border-t border-linen-100 ${
                  selected ? "bg-teal-50" : "bg-surface hover:bg-linen-50"
                }`}
                onClick={() => onSelectRow(row.id)}
              >
                <td className="px-2 py-1.5">{index + 1}</td>
                <td className="truncate px-2 py-1.5">{docLabel}</td>
                <td className="truncate px-2 py-1.5 font-medium">{row.productCode}</td>
                <td className="truncate px-2 py-1.5">{row.productName}</td>
                <td className="truncate px-2 py-1.5">{row.warehouseCode}</td>
                {kind === "serials" ? (
                  <td className="truncate px-2 py-1.5">
                    {warehouseNameByCode.get(row.warehouseCode) || row.warehouseCode}
                  </td>
                ) : null}
                <td className="px-2 py-1.5">
                  <input
                    aria-label={`Total needed for ${row.productCode}`}
                    className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-xs outline-none focus:border-teal-400 focus:bg-surface"
                    min={0}
                    onChange={(event) => onNeededQtyChange(row.id, Number(event.target.value))}
                    onClick={(event) => event.stopPropagation()}
                    step={kind === "serials" ? 1 : "any"}
                    type="number"
                    value={lineNeededQty(row)}
                  />
                </td>
                <td className="px-2 py-1.5">{createdQtyForKind(row, kind)}</td>
                {kind === "serials" ? (
                  <td className="px-2 py-1.5">{openQtyForKind(row, kind)}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
