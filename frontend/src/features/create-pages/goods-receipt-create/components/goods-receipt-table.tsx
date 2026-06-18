import type { GoodsReceiptRow } from "@/features/create-pages/goods-receipt-create/types/goods-receipt.types";
import {
  InventoryLineTable,
  type InventoryColumn,
} from "@/features/create-pages/create-shared/components/inventory/inventory-line-table";

interface GoodsReceiptTableProps {
  rows: GoodsReceiptRow[];
  onRowsChange: (rows: GoodsReceiptRow[]) => void;
}

const COLUMNS: InventoryColumn<GoodsReceiptRow>[] = [
  { key: "itemNo", label: "Item No.", width: "10%", type: "text" },
  { key: "itemDescription", label: "Item Description", width: "20%", type: "text" },
  { key: "uomCode", label: "UoM Code", width: "8%", type: "text" },
  { key: "uomName", label: "UoM Name", width: "8%", type: "text" },
  { key: "whse", label: "Whse", width: "6%", type: "text" },
  { key: "quantity", label: "Quantity", width: "7%", type: "number", align: "right" },
  { key: "unitPrice", label: "Unit Price", width: "9%", type: "text", align: "right" },
  {
    key: "total",
    label: "Total",
    width: "9%",
    type: "computed",
    align: "right",
    compute: (row) => getRowTotal(row),
  },
  {
    key: "binLocationAllocation",
    label: "Bin Location Allocation",
    width: "11%",
    type: "number",
    align: "center",
  },
  { key: "accountCode", label: "Account Code", width: "8%", type: "text" },
  { key: "itemCost", label: "Item Cost", width: "8%", type: "text", align: "right" },
];

const getRowTotal = (row: GoodsReceiptRow) => {
  const qty = Number(row.quantity) || 0;
  const priceStr = String(row.unitPrice).replace(/[^0-9.]/g, "");
  const price = parseFloat(priceStr) || 0;
  const computedTotal = qty * price;
  return computedTotal > 0 ? `FJD ${computedTotal.toFixed(2)}` : "FJD 0.00";
};

const getGrandTotal = (rows: GoodsReceiptRow[]) =>
  rows.reduce((sum, row) => {
    const totalStr = getRowTotal(row).replace(/[^0-9.]/g, "");
    return sum + (parseFloat(totalStr) || 0);
  }, 0);

const DEFAULT_ROW: GoodsReceiptRow = {
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
  itemCost: "",
};

export function GoodsReceiptTable({ rows, onRowsChange }: GoodsReceiptTableProps) {
  return (
    <InventoryLineTable
      rows={rows}
      onRowsChange={onRowsChange}
      defaultRow={DEFAULT_ROW}
      columns={COLUMNS}
      showGrandTotal
      getGrandTotal={getGrandTotal}
      minWidth="1100px"
    />
  );
}
