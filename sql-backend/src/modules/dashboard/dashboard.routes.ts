import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { dashboardDal } from "./dashboard.controller";

const router = Router();
router.use(validateSession);

// Original compatibility endpoints
router.get("/purchase-summary", dashboardDal.getPurchaseSummary);
router.get("/sales-summary", dashboardDal.getSalesSummary);
router.get("/stats", dashboardDal.getDashboardStats);

// Purchase segment
router.get("/purchase/kpi-summary", dashboardDal.getPurchaseKpiSummary);
router.get("/purchase/module-cards", dashboardDal.getPurchaseModuleCards);
router.get("/purchase/trend", dashboardDal.getPurchaseTrend);
router.get("/purchase/funnel", dashboardDal.getPurchaseFunnel);
router.get("/purchase/top-partners", dashboardDal.getPurchaseTopPartners);
router.get("/purchase/exceptions", dashboardDal.getPurchaseExceptions);

// Sales segment
router.get("/sales/kpi-summary", dashboardDal.getSalesKpiSummary);
router.get("/sales/module-cards", dashboardDal.getSalesModuleCards);
router.get("/sales/trend", dashboardDal.getSalesTrend);
router.get("/sales/funnel", dashboardDal.getSalesFunnel);
router.get("/sales/top-partners", dashboardDal.getSalesTopPartners);
router.get("/sales/exceptions", dashboardDal.getSalesExceptions);

// Inventory segment
router.get("/inventory/kpi-summary", dashboardDal.getInventoryKpiSummary);
router.get("/inventory/module-cards", dashboardDal.getInventoryModuleCards);
router.get("/inventory/trend", dashboardDal.getInventoryTrend);
router.get("/inventory/funnel", dashboardDal.getInventoryFunnel);
router.get("/inventory/top-partners", dashboardDal.getInventoryTopPartners);
router.get("/inventory/exceptions", dashboardDal.getInventoryExceptions);

// SQL-specific compact endpoints (kept for backward compat)
router.get("/summary", dashboardDal.getSummary);
router.get("/purchase", dashboardDal.getPurchaseStats);
router.get("/sales", dashboardDal.getSalesStats);
router.get("/inventory", dashboardDal.getInventoryStats);

export const dashboardRoutes = router;
