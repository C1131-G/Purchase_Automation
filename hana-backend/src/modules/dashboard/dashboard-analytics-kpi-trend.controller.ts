// Dashboard Controller: Handles HTTP requests for aggregate data summaries displayed on the user dashboard.

import type { NextFunction, Request, Response } from "express";

// Core
import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";
import type { AuthenticatedRequest } from "@/types/express.types";
// Services
import { dashboardService } from "./dashboard.service";

// Original combined stats fetcher (backward compatibility)

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
    const purchaseKpiSummaryResult = await dashboardService.getPurchaseKpiSummary(period, dbName);
    res.status(200).json({ success: true, ...purchaseKpiSummaryResult });
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
    const salesKpiSummaryResult = await dashboardService.getSalesKpiSummary(period, dbName);
    res.status(200).json({ success: true, ...salesKpiSummaryResult });
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
    const purchaseModuleCardsResult = await dashboardService.getPurchaseModuleCards(period, dbName);
    res.status(200).json({ success: true, ...purchaseModuleCardsResult });
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
    const salesModuleCardsResult = await dashboardService.getSalesModuleCards(period, dbName);
    res.status(200).json({ success: true, ...salesModuleCardsResult });
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
    const purchaseTrendResult = await dashboardService.getPurchaseTrend(period, dbName);
    res.status(200).json({ success: true, ...purchaseTrendResult });
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
    const salesTrendResult = await dashboardService.getSalesTrend(period, dbName);
    res.status(200).json({ success: true, ...salesTrendResult });
  } catch (error) {
    next(error);
  }
};

// Purchase Funnel
