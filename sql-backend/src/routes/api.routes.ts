import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { authenticatedApiLimiter } from "@/core/middleware/rate-limit.middleware";
import { authRoutes } from "./auth.routes";
import { organizationRoutes } from "./organization.routes";
import { masterDataRoutes } from "./master-data.routes";
import { purchaseOrderRoutes } from "./purchase-order.routes";
import { purchaseQuotationRoutes } from "./purchase-quotation.routes";
import { grpoRoutes } from "./grpo.routes";
import { apInvoiceRoutes } from "./ap-invoice.routes";
import { apCreditMemoRoutes } from "./ap-credit-memo.routes";
import { salesOrderRoutes } from "./sales-order.routes";
import { salesQuotationRoutes } from "./sales-quotation.routes";
import { arInvoiceRoutes } from "./ar-invoice.routes";
import { arCreditMemoRoutes } from "./ar-credit-memo.routes";
import { goodsReceiptRoutes } from "./goods-receipt.routes";
import { goodsIssueRoutes } from "./goods-issue.routes";
import { transferRoutes } from "./transfer.routes";
import { transferRequestRoutes } from "./transfer-request.routes";
import { incomingPaymentRoutes } from "./incoming-payment.routes";
import { outgoingPaymentRoutes } from "./outgoing-payment.routes";
import { itemMasterRoutes } from "./item-master.routes";
import { bankDetailsRoutes } from "./bank-details.routes";
import { salesRelationshipRoutes } from "./sales-relationship.routes";
import { attachmentRoutes } from "./attachments.routes";
import { dashboardRoutes } from "./dashboard.routes";

const router = Router();

// Public routes
router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);

// Protected routes
router.use(validateSession);
router.use(authenticatedApiLimiter);

router.use("/master-data", masterDataRoutes);
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
router.use("/transfers", transferRoutes);
router.use("/transfer-requests", transferRequestRoutes);
router.use("/incoming-payments", incomingPaymentRoutes);
router.use("/outgoing-payments", outgoingPaymentRoutes);
router.use("/bank-details", bankDetailsRoutes);
router.use("/sales-relationship", salesRelationshipRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/dashboard", dashboardRoutes);

export const apiRoutes = router;
