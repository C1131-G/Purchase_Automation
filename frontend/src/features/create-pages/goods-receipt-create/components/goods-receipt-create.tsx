import { InventoryDocumentCreate } from "@/features/create-pages/create-shared/components/inventory/inventory-document-create";
import { GoodsReceiptTable } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-table";

/**
 * GoodsReceiptCreate: Top-level orchestrator for the Goods Receipt entry form.
 */
export function GoodsReceiptCreate() {
  return (
    <InventoryDocumentCreate
      pageTitle="Create Goods Receipt"
      breadcrumbTo="/inventory/goods-receipt"
      documentType="goods-receipt"
      journalRemarkPlaceholder="Goods Receipt"
      tableComponent={GoodsReceiptTable}
      attachmentTargetPathPrefix="C:\\SAP_Attachments\\"
    />
  );
}
