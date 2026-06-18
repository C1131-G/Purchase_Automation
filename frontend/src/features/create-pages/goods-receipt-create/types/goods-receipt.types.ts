import type { InventoryBaseRow } from "@/features/create-pages/create-shared/components/inventory/types/inventory-document.types";

/**
 * GoodsReceiptRow: Represents one line item in the Goods Receipt product table.
 * Column order matches the SAP Business One Goods Receipt table exactly.
 */
export interface GoodsReceiptRow extends InventoryBaseRow {
  unitPrice: string;
  total: string;
}
