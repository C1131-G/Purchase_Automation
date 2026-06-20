// API Routes Index: The central aggregation point for all backend endpoints.
// It organizes sub-routers by business domain and mounts them under the common /api/v1 namespace.

import express from "express";

import { authenticatedApiLimiter } from "@/core/middleware/rate-limit.middleware";
import { apCreditMemoRoutes } from "@/routes/ap-credit-memo.routes";
import { apInvoiceRoutes } from "@/routes/ap-invoice.routes";
import { arCreditMemoRoutes } from "@/routes/ar-credit-memo.routes";
import { arInvoiceRoutes } from "@/routes/ar-invoice.routes";
import { authRoutes } from "@/routes/auth.routes";
import { bankDetailsRoutes } from "@/routes/bank-details.routes";
import { dashboardRoutes } from "@/routes/dashboard.routes";
import { financialPeriodRoutes } from "@/routes/financial-period.routes";
import { grpoRoutes } from "@/routes/grpo.routes";
import { incomingPaymentRoutes } from "@/routes/incoming-payment.routes";
import { masterDataRoutes } from "@/routes/master-data.routes";
import { organizationRoutes } from "@/routes/organization.routes";
import { outgoingPaymentRoutes } from "@/routes/outgoing-payment.routes";
import { purchaseOrderRoutes } from "@/routes/purchase-order.routes";
import { purchaseQuotationRoutes } from "@/routes/purchase-quotation.routes";
import { salesOrderRoutes } from "@/routes/sales-order.routes";
import salesRelationshipRoutes from "@/routes/sales-relationship.routes";
import { salesQuotationRoutes } from "@/routes/sales-quotation.routes";
import { itemMasterRoutes } from "@/routes/item-master.routes";
import { goodsReceiptRoutes } from "@/routes/goods-receipt.routes";
import { goodsIssueRoutes } from "@/routes/goods-issue.routes";
import { transferRequestRoutes } from "@/routes/transfer-request.routes";
import { transferRoutes } from "@/routes/transfer.routes";

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

// Financial Period: Read-only active period lookup from OACP.
router.use("/financial-period", financialPeriodRoutes);

// Attachments removed

export const apiRoutes = router;
