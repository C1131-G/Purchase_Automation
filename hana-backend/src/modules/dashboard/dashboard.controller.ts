// Dashboard Controller: Handles HTTP requests for aggregate data summaries displayed on the user dashboard.

import type { NextFunction, Request, Response } from "express";

// Core
import type { AuthenticatedRequest } from "@/types/express.types";
// Services
import { dashboardService } from "./dashboard.service";
import * as analytics from "./dashboard-analytics.controller";

// Original combined stats fetcher (backward compatibility)

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { range: string }
  >;
  try {
    const { dbName } = authReq.user;
    const { range } = authReq.query;

    const [purchase, sales] = await Promise.all([
      dashboardService.getPurchaseSummary(dbName, range),
      dashboardService.getSalesSummary(dbName, range),
    ]);

    res.status(200).json({
      data: {
        purchase,
        sales,
      },
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// Original purchase summary (backward compatibility)

export const getPurchaseSummary = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { range: string }
  >;
  try {
    const { dbName } = authReq.user;
    const { range } = authReq.query;

    const purchaseSummaryResult = await dashboardService.getPurchaseSummary(dbName, range);

    res.status(200).json({
      purchaseSummaryResult,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// Original sales summary (backward compatibility)

export const getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { range: string }
  >;
  try {
    const { dbName } = authReq.user;
    const { range } = authReq.query;

    const salesSummaryResult = await dashboardService.getSalesSummary(dbName, range);

    res.status(200).json({
      salesSummaryResult,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// --- NEW STREAMING CONTROLLERS ---

// Purchase KPI Summary

export const dashboardController = {
  getDashboardStats,
  getPurchaseSummary,
  getSalesSummary,
  getPurchaseKpiSummary: analytics.getPurchaseKpiSummary,
  getSalesKpiSummary: analytics.getSalesKpiSummary,
  getPurchaseModuleCards: analytics.getPurchaseModuleCards,
  getSalesModuleCards: analytics.getSalesModuleCards,
  getPurchaseTrend: analytics.getPurchaseTrend,
  getSalesTrend: analytics.getSalesTrend,
  getPurchaseFunnel: analytics.getPurchaseFunnel,
  getSalesFunnel: analytics.getSalesFunnel,
  getPurchaseTopPartners: analytics.getPurchaseTopPartners,
  getSalesTopPartners: analytics.getSalesTopPartners,
  getPurchaseExceptions: analytics.getPurchaseExceptions,
  getSalesExceptions: analytics.getSalesExceptions,
  getInventoryKpiSummary: analytics.getInventoryKpiSummary,
  getInventoryModuleCards: analytics.getInventoryModuleCards,
  getInventoryTrend: analytics.getInventoryTrend,
  getInventoryFunnel: analytics.getInventoryFunnel,
  getInventoryTopPartners: analytics.getInventoryTopPartners,
  getInventoryExceptions: analytics.getInventoryExceptions,
};
