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
  /** 'Y' if item is serial-managed, 'N' otherwise */
  manSerNum?: string;
  /** 'Y' if item is batch-managed, 'N' otherwise */
  manBtchNum?: string;
  /** Serial numbers entered for this line (serial-managed items) */
  serialNumbers?: string[];
  /** Batch number entered for this line (batch-managed items) */
  batchNumber?: string;
  /** Inventory Adjustment Reason UDF code (U_INVADJMTRES) */
  inventoryAdjustmentReason?: string;
}

export interface AttachmentItem {
  id: string;
  targetPath: string;
  fileName: string;
  attachmentDate: string;
  freeText: string;
}
