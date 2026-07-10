import type { GoodsIssueRow } from "@/features/create-pages/goods-issue-create/types/goods-issue.types";
import { GoodsIssueProductTable } from "./goods-issue-product-table";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/features/dashboard/utils/formatters";

interface GoodsIssueTableProps {
  rows: GoodsIssueRow[];
  onRowsChange: (rows: GoodsIssueRow[]) => void;
  openProductPopup: (rowId: string | null) => void;
  prefetchProducts: () => void;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  uoms?: CreateLookupOption[];
  reasons?: CreateLookupOption[];
  priceListCode?: string | undefined;
}

const DEFAULT_ROW: GoodsIssueRow = {
  id: "",
  itemNo: "",
  itemDescription: "",
  uomCode: "",
  uomName: "",
  whse: "",
  quantity: 1,
  unitPrice: "",
  total: "",
  binLocationAllocation: 0,
  accountCode: "",
  costingCode: "",
  inventoryAdjustmentReason: "",
};

export function GoodsIssueTable({
  rows,
  onRowsChange,
  openProductPopup,
  prefetchProducts,
  warehouses,
  warehousesLoading,
  uoms = [],
  reasons = [],
  priceListCode,
}: GoodsIssueTableProps) {
  const handleAddRow = () => {
    onRowsChange([...rows, { ...DEFAULT_ROW, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const grandTotal = rows.reduce((acc, row) => {
    const totalStr = String(row.total || "").replace(/[^0-9.]/g, "");
    const val = parseFloat(totalStr) || 0;
    return acc + val;
  }, 0);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3">
      {/* overflow-x-auto for horizontal scroll, overflow-y-visible so dropdowns escape the clip */}
      <div style={{ overflowX: "auto", overflowY: "visible" }}>
        <GoodsIssueProductTable
          rows={rows}
          onRowsChange={onRowsChange}
          openProductPopup={openProductPopup}
          prefetchProducts={prefetchProducts}
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
          uoms={uoms}
          reasons={reasons}
          priceListCode={priceListCode}
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
        <div className="pr-4 text-right">
          <span className="mr-2 text-xs font-medium text-zinc-500">Grand Total:</span>
          <span className="text-sm font-bold text-zinc-900">
            {formatCurrency(grandTotal, undefined)}
          </span>
        </div>
      </div>
    </div>
  );
}
