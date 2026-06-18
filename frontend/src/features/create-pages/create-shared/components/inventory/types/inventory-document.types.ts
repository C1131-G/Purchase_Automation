/**
 * Shared types for inventory document create flows (Goods Receipt, Goods Issue, etc.).
 */
export interface InventoryBaseRow {
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

export interface AttachmentItem {
  id: string;
  targetPath: string;
  fileName: string;
  attachmentDate: string;
  freeText: string;
}
