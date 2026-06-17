/**
 * GoodsReceiptRow: Represents one line item in the Goods Receipt product table.
 * Column order matches the SAP Business One Goods Receipt table exactly.
 */
export interface GoodsReceiptRow {
  id: string;
  itemNo: string;
  itemDescription: string;
  quantity: number;
  unitPrice: string;
  total: string;
  whse: string;
  binLocationAllocation: number;
  accountCode: string;
  itemCost: string;
  uomCode: string;
  uomName: string;

}
