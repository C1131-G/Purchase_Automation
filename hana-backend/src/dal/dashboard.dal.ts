// Dashboard DAL: Handles HTTP requests for aggregate data summaries displayed on the user dashboard.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
// Services
import { dashboardService } from "@/services/dashboard.service";

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

    logger.info({
      dbName,
      msg: "Fetching Unified Dashboard Stats",
      range: range || "yearly",
    });

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

    logger.info({
      dbName,
      msg: "Fetching Dashboard Purchase Summary",
      range: range || "yearly",
    });

    const data = await dashboardService.getPurchaseSummary(dbName, range);

    res.status(200).json({
      data,
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

    logger.info({
      dbName,
      msg: "Fetching Dashboard Sales Summary",
      range: range || "yearly",
    });

    const data = await dashboardService.getSalesSummary(dbName, range);

    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// --- NEW STREAMING CONTROLLERS ---

// Purchase KPI Summary
export const getPurchaseKpiSummary = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getPurchaseKpiSummary(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Sales KPI Summary
export const getSalesKpiSummary = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getSalesKpiSummary(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Purchase Module Cards
export const getPurchaseModuleCards = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getPurchaseModuleCards(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Sales Module Cards
export const getSalesModuleCards = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getSalesModuleCards(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Purchase Trend
export const getPurchaseTrend = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getPurchaseTrend(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Sales Trend
export const getSalesTrend = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getSalesTrend(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Purchase Funnel
export const getPurchaseFunnel = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getPurchaseFunnel(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Sales Funnel
export const getSalesFunnel = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getSalesFunnel(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Purchase Top Partners
export const getPurchaseTopPartners = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getPurchaseTopPartners(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Sales Top Partners
export const getSalesTopPartners = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getSalesTopPartners(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Purchase Exceptions
export const getPurchaseExceptions = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getPurchaseExceptions(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Sales Exceptions
export const getSalesExceptions = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getSalesExceptions(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Inventory KPI Summary
export const getInventoryKpiSummary = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getInventoryKpiSummary(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Inventory Module Cards
export const getInventoryModuleCards = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getInventoryModuleCards(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Inventory Trend
export const getInventoryTrend = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getInventoryTrend(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Inventory Funnel
export const getInventoryFunnel = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getInventoryFunnel(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Inventory Top Partners
export const getInventoryTopPartners = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getInventoryTopPartners(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Inventory Exceptions
export const getInventoryExceptions = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { period: DashboardPeriod }
  >;
  try {
    const { dbName } = authReq.user;
    const { period } = authReq.query;
    const result = await dashboardService.getInventoryExceptions(period, dbName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const dashboardDal = {
  getDashboardStats,
  getPurchaseSummary,
  getSalesSummary,
  getPurchaseKpiSummary,
  getSalesKpiSummary,
  getPurchaseModuleCards,
  getSalesModuleCards,
  getPurchaseTrend,
  getSalesTrend,
  getPurchaseFunnel,
  getSalesFunnel,
  getPurchaseTopPartners,
  getSalesTopPartners,
  getPurchaseExceptions,
  getSalesExceptions,
  getInventoryKpiSummary,
  getInventoryModuleCards,
  getInventoryTrend,
  getInventoryFunnel,
  getInventoryTopPartners,
  getInventoryExceptions,
};
