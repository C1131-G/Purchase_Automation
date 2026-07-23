// Dashboard Routes: Endpoints for high-level KPI aggregation, charts, process funnel steps, exceptions, and partner Pareto tables.

import express from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { dashboardController } from "./dashboard.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { DashboardSummaryQuerySchema, DashboardPeriodQuerySchema } from "./dashboard.schema";

const router = express.Router();

// Security: Dashboard data is sensitive and requires an active, validated session.
router.use(validateSession);

// Original compatibility endpoints
router.get(
  "/purchase-summary",
  validateQuery(DashboardSummaryQuerySchema),
  dashboardController.getPurchaseSummary,
);
router.get(
  "/sales-summary",
  validateQuery(DashboardSummaryQuerySchema),
  dashboardController.getSalesSummary,
);
router.get(
  "/stats",
  validateQuery(DashboardSummaryQuerySchema),
  dashboardController.getDashboardStats,
);

// --- NEW STREAMING SEGMENTS ---

// Purchase segment endpoints
router.get(
  "/purchase/kpi-summary",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getPurchaseKpiSummary,
);
router.get(
  "/purchase/module-cards",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getPurchaseModuleCards,
);
router.get(
  "/purchase/trend",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getPurchaseTrend,
);
router.get(
  "/purchase/funnel",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getPurchaseFunnel,
);
router.get(
  "/purchase/top-partners",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getPurchaseTopPartners,
);
router.get(
  "/purchase/exceptions",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getPurchaseExceptions,
);

// Sales segment endpoints
router.get(
  "/sales/kpi-summary",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getSalesKpiSummary,
);
router.get(
  "/sales/module-cards",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getSalesModuleCards,
);
router.get(
  "/sales/trend",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getSalesTrend,
);
router.get(
  "/sales/funnel",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getSalesFunnel,
);
router.get(
  "/sales/top-partners",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getSalesTopPartners,
);
router.get(
  "/sales/exceptions",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardController.getSalesExceptions,
);

export const dashboardRoutes = router;
