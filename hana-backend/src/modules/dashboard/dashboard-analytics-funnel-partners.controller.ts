// Dashboard Controller: Handles HTTP requests for aggregate data summaries displayed on the user dashboard.

import type { NextFunction, Request, Response } from "express";

// Core
import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";
import type { AuthenticatedRequest } from "@/types/express.types";
// Services
import { dashboardService } from "./dashboard.service";

// Original combined stats fetcher (backward compatibility)

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
    const purchaseFunnelResult = await dashboardService.getPurchaseFunnel(period, dbName);
    res.status(200).json({ success: true, ...purchaseFunnelResult });
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
    const salesFunnelResult = await dashboardService.getSalesFunnel(period, dbName);
    res.status(200).json({ success: true, ...salesFunnelResult });
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
    const purchaseTopPartnersResult = await dashboardService.getPurchaseTopPartners(period, dbName);
    res.status(200).json({ success: true, ...purchaseTopPartnersResult });
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
    const salesTopPartnersResult = await dashboardService.getSalesTopPartners(period, dbName);
    res.status(200).json({ success: true, ...salesTopPartnersResult });
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
    const purchaseExceptionsResult = await dashboardService.getPurchaseExceptions(period, dbName);
    res.status(200).json({ success: true, ...purchaseExceptionsResult });
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
    const salesExceptionsResult = await dashboardService.getSalesExceptions(period, dbName);
    res.status(200).json({ success: true, ...salesExceptionsResult });
  } catch (error) {
    next(error);
  }
};

// Inventory KPI Summary
