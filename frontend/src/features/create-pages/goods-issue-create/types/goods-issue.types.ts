import type { InventoryBaseRow } from "@/features/create-pages/create-shared/components/inventory/types/inventory-document.types";

/**
 * GoodsIssueRow: Represents one line item in the Goods Issue product table.
 */
export interface GoodsIssueRow extends InventoryBaseRow {
  unitPrice: string;
  total: string;
  costingCode: string;
}
