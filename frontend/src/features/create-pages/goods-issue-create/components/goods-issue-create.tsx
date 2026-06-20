import { InventoryDocumentCreate } from "@/features/create-pages/create-shared/components/inventory/inventory-document-create";
import { GoodsIssueTable } from "@/features/create-pages/goods-issue-create/components/goods-issue-table";

/**
 * GoodsIssueCreate: Top-level orchestrator for the Goods Issue entry form.
 */
export function GoodsIssueCreate() {
  return (
    <InventoryDocumentCreate
      pageTitle="Create Goods Issue"
      breadcrumbTo="/inventory/goods-issue"
      breadcrumbLabel="Goods Issue Data Table"
      documentType="goods-issue"
      journalRemarkPlaceholder="Goods Issue"
      tableComponent={GoodsIssueTable}
      attachmentTargetPathPrefix="C:\\Attachments\\"
    />
  );
}
