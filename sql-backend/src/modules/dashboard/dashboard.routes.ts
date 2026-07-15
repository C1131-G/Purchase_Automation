import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { dashboardController } from "./dashboard.controller";

const router = Router();
router.use(validateSession);

// Original compatibility endpoints
router.get("/purchase-summary", dashboardController.getPurchaseSummary);
router.get("/sales-summary", dashboardController.getSalesSummary);
router.get("/stats", dashboardController.getDashboardStats);

// Purchase segment
router.get("/purchase/kpi-summary", dashboardController.getPurchaseKpiSummary);
router.get("/purchase/module-cards", dashboardController.getPurchaseModuleCards);
router.get("/purchase/trend", dashboardController.getPurchaseTrend);
router.get("/purchase/funnel", dashboardController.getPurchaseFunnel);
router.get("/purchase/top-partners", dashboardController.getPurchaseTopPartners);
router.get("/purchase/exceptions", dashboardController.getPurchaseExceptions);

// Sales segment
router.get("/sales/kpi-summary", dashboardController.getSalesKpiSummary);
router.get("/sales/module-cards", dashboardController.getSalesModuleCards);
router.get("/sales/trend", dashboardController.getSalesTrend);
router.get("/sales/funnel", dashboardController.getSalesFunnel);
router.get("/sales/top-partners", dashboardController.getSalesTopPartners);
router.get("/sales/exceptions", dashboardController.getSalesExceptions);

// Inventory segment
router.get("/inventory/kpi-summary", dashboardController.getInventoryKpiSummary);
router.get("/inventory/module-cards", dashboardController.getInventoryModuleCards);
router.get("/inventory/trend", dashboardController.getInventoryTrend);
router.get("/inventory/funnel", dashboardController.getInventoryFunnel);
router.get("/inventory/top-partners", dashboardController.getInventoryTopPartners);
router.get("/inventory/exceptions", dashboardController.getInventoryExceptions);

// SQL-specific compact endpoints (kept for backward compat)
router.get("/summary", dashboardController.getSummary);
router.get("/purchase", dashboardController.getPurchaseStats);
router.get("/sales", dashboardController.getSalesStats);
router.get("/inventory", dashboardController.getInventoryStats);

export const dashboardRoutes = router;
