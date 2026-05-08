import express from "express";

import { authenticatedApiLimiter } from "@/core/middleware/rate-limit.middleware";

import { apCreditMemoRoutes } from "./ap-credit-memo.routes";
import { apInvoiceRoutes } from "./ap-invoice.routes";
import { arCreditMemoRoutes } from "./ar-credit-memo.routes";
import { arInvoiceRoutes } from "./ar-invoice.routes";
import { authRoutes } from "./auth.routes";
import { dashboardRoutes } from "./dashboard.routes";
import { grpoRoutes } from "./grpo.routes";
import { healthRoutes } from "./health.routes";
import { incomingPaymentRoutes } from "./incoming-payment.routes";
import { masterDataRoutes } from "./master-data.routes";
import { organizationRoutes } from "./organization.routes";
import { outgoingPaymentRoutes } from "./outgoing-payment.routes";
import { purchaseOrderRoutes } from "./purchase-order.routes";
import { salesOrderRoutes } from "./sales-order.routes";
import { salesQuotationRoutes } from "./sales-quotation.routes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);

router.use(authenticatedApiLimiter);

router.use("/dashboard", dashboardRoutes);
router.use("/master-data", masterDataRoutes);

router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/grpos", grpoRoutes);
router.use("/ap-invoices", apInvoiceRoutes);
router.use("/ap-credit-memos", apCreditMemoRoutes);
router.use("/ar-invoices", arInvoiceRoutes);
router.use("/ar-credit-memos", arCreditMemoRoutes);
router.use("/outgoing-payments", outgoingPaymentRoutes);
router.use("/incoming-payments", incomingPaymentRoutes);
router.use("/sales-orders", salesOrderRoutes);
router.use("/sales-quotations", salesQuotationRoutes);

router.use(healthRoutes);

export const apiRoutes = router;
