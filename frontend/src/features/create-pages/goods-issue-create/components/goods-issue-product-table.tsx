import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import { GoodsIssueProductTableRow } from "./goods-issue-product-table-row";
import type { GoodsIssueRow } from "../types/goods-issue.types";

interface GoodsIssueProductTableProps {
  rows: GoodsIssueRow[];
  onRowsChange: (rows: GoodsIssueRow[]) => void;
  openProductPopup: (rowId: string | null) => void;
  prefetchProducts: () => void;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  disableLineInputs?: boolean;
  uoms?: CreateLookupOption[];
  priceListCode?: string | undefined;
}

export function GoodsIssueProductTable({
  rows,
  onRowsChange,
  openProductPopup,
  prefetchProducts,
  warehouses,
  warehousesLoading,
  disableLineInputs = false,
  uoms = [],
  priceListCode,
}: GoodsIssueProductTableProps) {
  const updateProductRow = (id: string, patch: Partial<GoodsIssueRow>) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeProductRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div style={{ overflowX: "auto", overflowY: "visible" }}>
      <table className="w-full text-left text-sm text-zinc-700 min-w-[1400px]">
        <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          <tr>
            <th className="w-[12%] px-2 py-2">Item No.</th>
            <th className="w-[18%] px-2 py-2">Item Description</th>
            <th className="w-[8%] px-2 py-2 text-left">Quantity</th>
            <th className="w-[8%] px-2 py-2 text-left">Item Cost</th>
            <th className="w-[10%] px-2 py-2">Warehouse</th>
            <th className="w-[10%] px-2 py-2">Bin Loc. Alloc.</th>
            <th className="w-[8%] px-2 py-2">UoM Code</th>
            <th className="w-[8%] px-2 py-2">UoM Name</th>
            <th className="w-[10%] px-2 py-2">G/L Account</th>
            <th className="w-[5%] px-2 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8" colSpan={10}>
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                  <div className="text-sm font-medium text-zinc-700">No items yet</div>
                  <div className="text-xs text-zinc-500">
                    Use <span className="font-semibold text-zinc-700">Search Products</span> to add
                    items.
                  </div>
                </div>
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <GoodsIssueProductTableRow
              key={row.id}
              row={row}
              openProductPopup={openProductPopup}
              updateProductRow={updateProductRow}
              removeProductRow={removeProductRow}
              prefetchProducts={prefetchProducts}
              warehouses={warehouses}
              warehousesLoading={warehousesLoading}
              disableInputs={disableLineInputs}
              uoms={uoms}
              priceListCode={priceListCode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
