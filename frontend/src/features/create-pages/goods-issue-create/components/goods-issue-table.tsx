import type { GoodsIssueRow } from "@/features/create-pages/goods-issue-create/types/goods-issue.types";
import {
  InventoryLineTable,
  type InventoryColumn,
} from "@/features/create-pages/create-shared/components/inventory/inventory-line-table";

interface GoodsIssueTableProps {
  rows: GoodsIssueRow[];
  onRowsChange: (rows: GoodsIssueRow[]) => void;
}

const COLUMNS: InventoryColumn<GoodsIssueRow>[] = [
  { key: "itemNo", label: "Item No.", width: "12%", type: "text" },
  { key: "itemDescription", label: "Item Description", width: "24%", type: "text" },
  { key: "uomCode", label: "UoM Code", width: "9%", type: "text" },
  { key: "uomName", label: "UoM Name", width: "9%", type: "text" },
  { key: "whse", label: "Whse", width: "7%", type: "text" },
  { key: "quantity", label: "Quantity", width: "8%", type: "number", align: "right" },
  {
    key: "binLocationAllocation",
    label: "Bin Location Allocation",
    width: "12%",
    type: "number",
    align: "center",
  },
  { key: "accountCode", label: "Account Code", width: "9%", type: "text" },
];

const DEFAULT_ROW: GoodsIssueRow = {
  id: "",
  itemNo: "",
  itemDescription: "",
  uomCode: "",
  uomName: "",
  whse: "",
  quantity: 1,
  binLocationAllocation: 0,
  accountCode: "",
};

export function GoodsIssueTable({ rows, onRowsChange }: GoodsIssueTableProps) {
  return (
    <InventoryLineTable
      rows={rows}
      onRowsChange={onRowsChange}
      defaultRow={DEFAULT_ROW}
      columns={COLUMNS}
      minWidth="1000px"
    />
  );
}
