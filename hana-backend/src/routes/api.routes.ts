// API Routes Index: The central aggregation point for all backend endpoints.
// It organizes sub-routers by business domain and mounts them under the common /api/v1 namespace.

import express from "express";

import { authenticatedApiLimiter } from "@/core/middleware/rate-limit.middleware";
import { apCreditMemoRoutes } from "@/modules/ap-credit-memo/ap-credit-memo.routes";
import { apInvoiceRoutes } from "@/modules/ap-invoice/ap-invoice.routes";
import { arCreditMemoRoutes } from "@/modules/ar-credit-memo/ar-credit-memo.routes";
import { arInvoiceRoutes } from "@/modules/ar-invoice/ar-invoice.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { bankDetailsRoutes } from "@/modules/bank-details/bank-details.routes";
import { dashboardRoutes } from "@/modules/dashboard/dashboard.routes";
import { grpoRoutes } from "@/modules/grpo/grpo.routes";
import { incomingPaymentRoutes } from "@/modules/incoming-payment/incoming-payment.routes";
import { masterDataRoutes } from "@/modules/master-data/master-data.routes";
import { organizationRoutes } from "@/modules/organization/organization.routes";
import { outgoingPaymentRoutes } from "@/modules/outgoing-payment/outgoing-payment.routes";
import { purchaseOrderRoutes } from "@/modules/purchase-order/purchase-order.routes";
import { purchaseQuotationRoutes } from "@/modules/purchase-quotation/purchase-quotation.routes";
import { salesOrderRoutes } from "@/modules/sales-order/sales-order.routes";
import salesRelationshipRoutes from "@/modules/relationship-map/relationship-map.routes";
import { salesQuotationRoutes } from "@/modules/sales-quotation/sales-quotation.routes";
import { itemMasterRoutes } from "@/modules/item-master/item-master.routes";
import { goodsReceiptRoutes } from "@/modules/goods-receipt/goods-receipt.routes";
import { goodsIssueRoutes } from "@/modules/goods-issue/goods-issue.routes";
import { transferRequestRoutes } from "@/modules/transfer-request/transfer-request.routes";
import { transferRoutes } from "@/modules/transfer/transfer.routes";

const router = express.Router();

// Identity & Orchestration: Routes for tenant discovery, user login, and high-level KPI aggregation.
router.use("/organizations", organizationRoutes);
router.use("/auth", authRoutes);

// Apply broader authenticated limiter after public/bootstrap routes.
router.use(authenticatedApiLimiter);

router.use("/dashboard", dashboardRoutes);

// Procure-to-Pay (P2P): Routes primarily used by Vendors to track their orders, deliveries, and incoming credits.
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/purchase-quotations", purchaseQuotationRoutes);
router.use("/grpos", grpoRoutes);
router.use("/ap-invoices", apInvoiceRoutes);
router.use("/ap-credit-memos", apCreditMemoRoutes);
router.use("/outgoing-payments", outgoingPaymentRoutes);

// Order-to-Cash (O2C): Routes primarily used by Customers to view sales orders, invoices, and settle payments.
router.use("/sales-quotations", salesQuotationRoutes);
router.use("/sales-orders", salesOrderRoutes);
router.use("/ar-invoices", arInvoiceRoutes);
router.use("/ar-credit-memos", arCreditMemoRoutes);
router.use("/incoming-payments", incomingPaymentRoutes);
router.use("/relationship-map", salesRelationshipRoutes);

// Inventory Modules
router.use("/items", itemMasterRoutes);
router.use("/goods-receipts", goodsReceiptRoutes);
router.use("/goods-issues", goodsIssueRoutes);
router.use("/inventory-transfer-requests", transferRequestRoutes);
router.use("/inventory-transfers", transferRoutes);

// Utility: Read-only master data lookups for dropdowns and UI auto-completion.
router.use("/master-data", masterDataRoutes);

// Bank Details: Read-only bank master data from ODSC.
router.use("/bank-details", bankDetailsRoutes);

import { attachmentsRoutes } from "@/modules/attachments/attachments.routes";

router.use("/attachments", attachmentsRoutes);

export const apiRoutes = router;
