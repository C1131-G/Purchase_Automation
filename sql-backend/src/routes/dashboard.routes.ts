import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { dashboardService } from "@/services/dashboard.service";

const router = express.Router();

router.use(validateSession);

const getDbName = (req: express.Request) =>
  (req as express.Request & { user: { dbName: string } }).user?.dbName || "";

router.get("/purchase-summary", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const data = await dashboardService.getPurchaseSummary(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/sales-summary", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const data = await dashboardService.getSalesSummary(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const data = await dashboardService.getStats(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

export const dashboardRoutes = router;
