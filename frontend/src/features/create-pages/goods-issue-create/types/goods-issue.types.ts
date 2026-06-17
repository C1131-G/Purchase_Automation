/**
 * GoodsIssueRow: Represents one line item in the Goods Issue product table.
 */
export interface GoodsIssueRow {
  id: string;
  itemNo: string;
  itemDescription: string;
  uomCode: string;
  uomName: string;
  whse: string;
  quantity: number;
  binLocationAllocation: number;
  accountCode: string;
  itemCost: string;
}
