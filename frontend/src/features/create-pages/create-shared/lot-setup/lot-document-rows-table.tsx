import { useId } from "react";

import { LotQtyInput } from "@/features/create-pages/create-shared/lot-setup/lot-qty-input";
import type { LotSetupKind } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import {
  createdQtyForKind,
  lineNeededQty,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

interface LotDocumentRowsTableProps {
  activeRowId: string | null;
  docLabel: string;
  kind: LotSetupKind;
  onSelectRow: (rowId: string) => void;
  onNeededQtyChange: (rowId: string, quantity: number) => void;
  rows: ProductRow[];
  warehouseNames?: Record<string, string>;
}

export function LotDocumentRowsTable({
  activeRowId,
  docLabel,
  kind,
  onNeededQtyChange,
  onSelectRow,
  rows,
  warehouseNames = {},
}: LotDocumentRowsTableProps) {
  // One radio group per table instance so row choice is reachable by keyboard.
  const rowGroupName = useId();

  return (
    <div className="max-h-48 w-full overflow-auto rounded-lg border border-linen-200">
      <table className="w-full table-fixed text-left text-sm text-ink-900">
        <caption className="sr-only">Rows from documents</caption>
        <thead className="sticky top-0 z-10 bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="w-12 px-4 py-2.5" scope="col">
              #
            </th>
            {kind === "serials" ? (
              <th className="w-[12%] px-4 py-2.5" scope="col">
                Doc. No.
              </th>
            ) : null}
            <th className="w-[16%] px-4 py-2.5" scope="col">
              Item No.
            </th>
            <th className="px-4 py-2.5" scope="col">
              Description
            </th>
            <th className="w-[22%] px-4 py-2.5" scope="col">
              Warehouse
            </th>
            <th className="w-[12%] px-4 py-2.5" scope="col">
              Needed
            </th>
            <th className="w-[12%] px-4 py-2.5" scope="col">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-4 text-center text-sm text-neutral-500"
                colSpan={kind === "serials" ? 7 : 6}
              >
                No {kind === "serials" ? "serial" : "batch"}-managed lines on this document.
              </td>
            </tr>
          ) : null}
          {rows.map((row, index) => {
            const selected = row.id === activeRowId;
            const created = createdQtyForKind(row, kind);
            const warehouseCode = row.warehouseCode.trim();
            const warehouseName = warehouseNames[warehouseCode]?.trim() ?? "";
            const warehouseLabel =
              warehouseName && warehouseName !== warehouseCode
                ? `${warehouseName} - ${warehouseCode}`
                : warehouseCode || "—";

            return (
              <tr
                key={row.id}
                className={`cursor-pointer border-t border-linen-100 transition-colors ${
                  selected
                    ? "bg-teal-50 ring-1 ring-inset ring-teal-200"
                    : "bg-surface hover:bg-linen-50"
                }`}
                onClick={() => onSelectRow(row.id)}
              >
                <td className="px-4 py-2.5 text-xs text-neutral-500">
                  <span className="flex items-center gap-2">
                    <input
                      aria-label={`Select ${row.productCode} line`}
                      checked={selected}
                      className="size-3.5 accent-teal-500"
                      name={rowGroupName}
                      onChange={() => onSelectRow(row.id)}
                      type="radio"
                      value={row.id}
                    />
                    {index + 1}
                  </span>
                </td>
                {kind === "serials" ? (
                  <td className="truncate px-4 py-2.5 text-xs text-neutral-600" title={docLabel}>
                    {docLabel}
                  </td>
                ) : null}
                <td className="truncate px-4 py-2.5 font-medium" title={row.productCode}>
                  {row.productCode}
                </td>
                <td className="truncate px-4 py-2.5 text-neutral-600" title={row.productName}>
                  {row.productName}
                </td>
                <td className="truncate px-4 py-2.5 text-neutral-600" title={warehouseLabel}>
                  {warehouseLabel}
                </td>
                <td className="px-4 py-2.5 text-left">
                  <LotQtyInput
                    ariaLabel={`Total needed for ${row.productCode}`}
                    min={1}
                    onCommit={(quantity) => onNeededQtyChange(row.id, quantity)}
                    value={lineNeededQty(row)}
                  />
                </td>
                <td className="px-4 py-2.5 text-left font-medium text-ink-900">{created}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
