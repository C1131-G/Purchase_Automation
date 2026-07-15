import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { initTenantContext } from "@/core/middleware/tenant.middleware";
import { authenticatedApiLimiter } from "@/core/middleware/rate-limit.middleware";
import { requestTransformerMiddleware } from "@/core/middleware/request-transformer.middleware";

import { apCreditMemoRoutes } from "@/modules/ap-credit-memo/ap-credit-memo.routes";
import { apInvoiceRoutes } from "@/modules/ap-invoice/ap-invoice.routes";
import { arCreditMemoRoutes } from "@/modules/ar-credit-memo/ar-credit-memo.routes";
import { arInvoiceRoutes } from "@/modules/ar-invoice/ar-invoice.routes";
import { attachmentRoutes } from "@/modules/attachments/attachments.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { bankDetailsRoutes } from "@/modules/bank-details/bank-details.routes";
import { dashboardRoutes } from "@/modules/dashboard/dashboard.routes";
import { goodsIssueRoutes } from "@/modules/goods-issue/goods-issue.routes";
import { goodsReceiptRoutes } from "@/modules/goods-receipt/goods-receipt.routes";
import { grpoRoutes } from "@/modules/grpo/grpo.routes";
import { incomingPaymentRoutes } from "@/modules/incoming-payment/incoming-payment.routes";
import { itemMasterRoutes } from "@/modules/item-master/item-master.routes";
import { masterDataRoutes } from "@/modules/master-data/master-data.routes";
import { organizationRoutes } from "@/modules/organization/organization.routes";
import { outgoingPaymentRoutes } from "@/modules/outgoing-payment/outgoing-payment.routes";
import { purchaseOrderRoutes } from "@/modules/purchase-order/purchase-order.routes";
import { purchaseQuotationRoutes } from "@/modules/purchase-quotation/purchase-quotation.routes";
import { salesRelationshipRoutes } from "@/modules/relationship-map/relationship-map.routes";
import { salesOrderRoutes } from "@/modules/sales-order/sales-order.routes";
import { salesQuotationRoutes } from "@/modules/sales-quotation/sales-quotation.routes";
import { transferRequestRoutes } from "@/modules/transfer-request/transfer-request.routes";
import { transferRoutes } from "@/modules/transfer/transfer.routes";

const router = Router();

// Public routes
router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);

// Protected routes
router.use(validateSession);
router.use(initTenantContext);
router.use(authenticatedApiLimiter);
router.use(requestTransformerMiddleware);

router.use("/master-data", masterDataRoutes);
router.use("/items", itemMasterRoutes);
router.use("/item-master", itemMasterRoutes);
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/purchase-quotations", purchaseQuotationRoutes);
router.use("/grpos", grpoRoutes);
router.use("/ap-invoices", apInvoiceRoutes);
router.use("/ap-credit-memos", apCreditMemoRoutes);
router.use("/sales-orders", salesOrderRoutes);
router.use("/sales-quotations", salesQuotationRoutes);
router.use("/ar-invoices", arInvoiceRoutes);
router.use("/ar-credit-memos", arCreditMemoRoutes);
router.use("/goods-receipts", goodsReceiptRoutes);
router.use("/goods-issues", goodsIssueRoutes);
router.use("/inventory-transfers", transferRoutes);
router.use("/transfers", transferRoutes);
router.use("/inventory-transfer-requests", transferRequestRoutes);
router.use("/transfer-requests", transferRequestRoutes);
router.use("/incoming-payments", incomingPaymentRoutes);
router.use("/outgoing-payments", outgoingPaymentRoutes);
router.use("/bank-details", bankDetailsRoutes);
router.use("/relationship-map", salesRelationshipRoutes);
router.use("/sales-relationship", salesRelationshipRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/dashboard", dashboardRoutes);

export const apiRoutes = router;
