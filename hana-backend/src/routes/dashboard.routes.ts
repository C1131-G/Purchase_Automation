// Dashboard Routes: Endpoints for high-level KPI aggregation, charts, process funnel steps, exceptions, and partner Pareto tables.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { dashboardDal } from "@/dal/dashboard.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  DashboardSummaryQuerySchema,
  DashboardPeriodQuerySchema,
} from "@/validation/schemas/inputs/dashboard.input";

const router = express.Router();

// Security: Dashboard data is sensitive and requires an active, validated session.
router.use(validateSession);

// Original compatibility endpoints
router.get(
  "/purchase-summary",
  validateQuery(DashboardSummaryQuerySchema),
  dashboardDal.getPurchaseSummary,
);
router.get(
  "/sales-summary",
  validateQuery(DashboardSummaryQuerySchema),
  dashboardDal.getSalesSummary,
);
router.get("/stats", validateQuery(DashboardSummaryQuerySchema), dashboardDal.getDashboardStats);

// --- NEW STREAMING SEGMENTS ---

// Purchase segment endpoints
router.get(
  "/purchase/kpi-summary",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getPurchaseKpiSummary,
);
router.get(
  "/purchase/module-cards",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getPurchaseModuleCards,
);
router.get(
  "/purchase/trend",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getPurchaseTrend,
);
router.get(
  "/purchase/funnel",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getPurchaseFunnel,
);
router.get(
  "/purchase/top-partners",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getPurchaseTopPartners,
);
router.get(
  "/purchase/exceptions",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getPurchaseExceptions,
);

// Sales segment endpoints
router.get(
  "/sales/kpi-summary",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getSalesKpiSummary,
);
router.get(
  "/sales/module-cards",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getSalesModuleCards,
);
router.get("/sales/trend", validateQuery(DashboardPeriodQuerySchema), dashboardDal.getSalesTrend);
router.get("/sales/funnel", validateQuery(DashboardPeriodQuerySchema), dashboardDal.getSalesFunnel);
router.get(
  "/sales/top-partners",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getSalesTopPartners,
);
router.get(
  "/sales/exceptions",
  validateQuery(DashboardPeriodQuerySchema),
  dashboardDal.getSalesExceptions,
);

export const dashboardRoutes = router;
