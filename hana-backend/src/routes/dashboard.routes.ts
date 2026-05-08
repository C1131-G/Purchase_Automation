// Dashboard Routes: Endpoints for high-level KPI aggregation and performance metrics.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { dashboardDal } from "@/dal/dashboard.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { DashboardSummaryQuerySchema } from "@/validation/schemas/inputs/dashboard.input";

const router = express.Router();

// Security: Dashboard data is sensitive and requires an active, validated session.
router.use(validateSession);

// GET /purchase-summary: Aggregates procurement data (POs, GRPOs, Invoices) for vendor-side analysis.
router.get(
  "/purchase-summary",
  validateQuery(DashboardSummaryQuerySchema),
  dashboardDal.getPurchaseSummary,
);

// GET /sales-summary: Aggregates customer-side document flows for order-to-cash analysis.
router.get(
  "/sales-summary",
  validateQuery(DashboardSummaryQuerySchema),
  dashboardDal.getSalesSummary,
);

// GET /stats: Fetches real-time counts and totals for dashboard widgets (e.g., 'Total Open Orders').
router.get("/stats", validateQuery(DashboardSummaryQuerySchema), dashboardDal.getDashboardStats);

export const dashboardRoutes = router;
