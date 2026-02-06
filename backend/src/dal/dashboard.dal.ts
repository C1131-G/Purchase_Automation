// Dashboard DAL: Handles HTTP requests for aggregate data summaries displayed on the user dashboard.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { DashboardQuery } from "@/dal/types/dashboard.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
// Services
import { dashboardService } from "@/services/dashboard.service";

// Fetches a combined summary of Purchase and Sales data for the dashboard.
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    DashboardQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { range } = authReq.query;

    logger.info({ msg: "Fetching Unified Dashboard Stats", dbName, range: range || "yearly" });

    // Execute multiple summary fetches concurrently to minimize total request latency.
    const [purchase, sales] = await Promise.all([
      dashboardService.getPurchaseSummary(dbName, range),
      dashboardService.getSalesSummary(dbName, range),
    ]);

    res.status(200).json({
      success: true,
      data: {
        purchase,
        sales,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Retrieves purchase-specific metrics (e.g., total POs, GRPO vs Invoice progress) for the dashboard.
export const getPurchaseSummary = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    DashboardQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { range } = authReq.query;

    logger.info({ msg: "Fetching Dashboard Purchase Summary", dbName, range: range || "yearly" });

    const data = await dashboardService.getPurchaseSummary(dbName, range);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Retrieves sales-specific metrics (e.g., total SOs, AR Invoices) for the dashboard.
export const getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    DashboardQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { range } = authReq.query;

    logger.info({ msg: "Fetching Dashboard Sales Summary", dbName, range: range || "yearly" });

    const data = await dashboardService.getSalesSummary(dbName, range);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const dashboardDal = {
  getDashboardStats,
  getPurchaseSummary,
  getSalesSummary,
};
