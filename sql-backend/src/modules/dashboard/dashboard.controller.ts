import type { RequestHandler } from "express";

import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";

import * as analytics from "./dashboard-analytics.controller";
import { dashboardService } from "./dashboard.service";

const periodFromQuery = (period: unknown): DashboardPeriod => {
  if (period === "week" || period === "month" || period === "year" || period === "all") {
    return period;
  }
  if (period === "weekly") {
    return "week";
  }
  if (period === "yearly") {
    return "year";
  }
  return "month";
};
const rangeFromQuery = (range: unknown): string => (typeof range === "string" ? range : "yearly");

export const getPurchaseSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseSummary(rangeFromQuery(req.query.range));
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getSalesSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesSummary(rangeFromQuery(req.query.range));
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getDashboardStats: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getDashboardStats(rangeFromQuery(req.query.range));
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getSummary: RequestHandler = async (req, res, next) => {
  try {
    const period = periodFromQuery(req.query.period);
    const result = await dashboardService.getDashboard(period);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getPurchaseStats: RequestHandler = async (req, res, next) => {
  try {
    const period = periodFromQuery(req.query.period);
    const result = await dashboardService.getPurchaseDashboard(period);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getSalesStats: RequestHandler = async (req, res, next) => {
  try {
    const period = periodFromQuery(req.query.period);
    const result = await dashboardService.getSalesDashboard(period);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryStats: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getInventoryDashboard();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryKpiSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryKpiSummary(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryModuleCards: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryModuleCards(
      periodFromQuery(req.query.period),
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryTrend: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryTrend(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryFunnel: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryFunnel(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryTopPartners: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryTopPartners(
      periodFromQuery(req.query.period),
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryExceptions: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryExceptions(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const dashboardController = {
  ...analytics,
  getDashboardStats,
  getInventoryExceptions,
  getInventoryFunnel,
  getInventoryKpiSummary,
  getInventoryModuleCards,
  getInventoryStats,
  getInventoryTopPartners,
  getInventoryTrend,
  getPurchaseStats,
  getPurchaseSummary,
  getSalesStats,
  getSalesSummary,
  getSummary,
};
