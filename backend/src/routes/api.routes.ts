// API Routes Index: The central aggregation point for all backend endpoints.
// It organizes sub-routers by business domain and mounts them under the common /api/v1 namespace.

import express from "express";

import { authenticatedApiLimiter } from "@/core/middleware/rate-limit.middleware";
import { apCreditNoteRoutes } from "@/routes/ap-credit-note.routes";
import { apInvoiceRoutes } from "@/routes/ap-invoice.routes";
import { arCreditNoteRoutes } from "@/routes/ar-credit-note.routes";
import { arInvoiceRoutes } from "@/routes/ar-invoice.routes";
import { authRoutes } from "@/routes/auth.routes";
import { dashboardRoutes } from "@/routes/dashboard.routes";
import { grpoRoutes } from "@/routes/grpo.routes";
import { incomingPaymentRoutes } from "@/routes/incoming-payment.routes";
import { masterDataRoutes } from "@/routes/master-data.routes";
import { organizationRoutes } from "@/routes/organization.routes";
import { outgoingPaymentRoutes } from "@/routes/outgoing-payment.routes";
import { purchaseOrderRoutes } from "@/routes/purchase-order.routes";
import { salesOrderRoutes } from "@/routes/sales-order.routes";

const router = express.Router();

// Identity & Orchestration: Routes for tenant discovery, user login, and high-level KPI aggregation.
router.use("/organizations", organizationRoutes);
router.use("/auth", authRoutes);

// Apply broader authenticated limiter after public/bootstrap routes.
router.use(authenticatedApiLimiter);

router.use("/dashboard", dashboardRoutes);

// Procure-to-Pay (P2P): Routes primarily used by Vendors to track their orders, deliveries, and incoming credits.
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/grpos", grpoRoutes);
router.use("/ap-invoices", apInvoiceRoutes);
router.use("/ap-credit-notes", apCreditNoteRoutes);
router.use("/outgoing-payments", outgoingPaymentRoutes);

// Order-to-Cash (O2C): Routes primarily used by Customers to view sales orders, invoices, and settle payments.
router.use("/sales-orders", salesOrderRoutes);
router.use("/ar-invoices", arInvoiceRoutes);
router.use("/ar-credit-notes", arCreditNoteRoutes);
router.use("/incoming-payments", incomingPaymentRoutes);

// Utility: Read-only master data lookups for dropdowns and UI auto-completion.
router.use("/master-data", masterDataRoutes);

export const apiRoutes = router;
