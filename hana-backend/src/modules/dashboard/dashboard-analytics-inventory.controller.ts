// Dashboard Controller: Handles HTTP requests for aggregate data summaries displayed on the user dashboard.

import type { NextFunction, Request, Response } from "express";

// Core
import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";
import type { AuthenticatedRequest } from "@/types/express.types";
// Services
import { dashboardService } from "./dashboard.service";

// Original combined stats fetcher (backward compatibility)

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
    const inventoryKpiSummaryResult = await dashboardService.getInventoryKpiSummary(period, dbName);
    res.status(200).json({ success: true, ...inventoryKpiSummaryResult });
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
    const inventoryModuleCardsResult = await dashboardService.getInventoryModuleCards(
      period,
      dbName,
    );
    res.status(200).json({ success: true, ...inventoryModuleCardsResult });
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
    const inventoryTrendResult = await dashboardService.getInventoryTrend(period, dbName);
    res.status(200).json({ success: true, ...inventoryTrendResult });
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
    const inventoryFunnelResult = await dashboardService.getInventoryFunnel(period, dbName);
    res.status(200).json({ success: true, ...inventoryFunnelResult });
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
    const inventoryTopPartnersResult = await dashboardService.getInventoryTopPartners(
      period,
      dbName,
    );
    res.status(200).json({ success: true, ...inventoryTopPartnersResult });
  } catch (error) {
    next(error);
  }
};

// Inventory Exceptions
