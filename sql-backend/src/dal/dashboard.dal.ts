// Dashboard DAL: All 22 endpoints matching hana-backend.

import type { RequestHandler } from "express";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";

const periodFromQuery = (p: unknown): DashboardPeriod => {
  if (p === "week" || p === "month" || p === "year" || p === "all") return p;
  if (p === "weekly") return "week";
  if (p === "yearly") return "year";
  return "month";
};
const rangeFromQuery = (r: unknown): string => (typeof r === "string" ? r : "yearly");

// ─── Original compatibility endpoints ──────────────────────────────────────

export const getPurchaseSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseSummary(rangeFromQuery(req.query.range));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getSalesSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesSummary(rangeFromQuery(req.query.range));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getDashboardStats: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getDashboardStats(rangeFromQuery(req.query.range));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getSummary: RequestHandler = async (req, res, next) => {
  try {
    const p = periodFromQuery(req.query.period);
    const result = await dashboardService.getDashboard(p);
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getPurchaseStats: RequestHandler = async (req, res, next) => {
  try {
    const p = periodFromQuery(req.query.period);
    const result = await dashboardService.getPurchaseDashboard(p);
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getSalesStats: RequestHandler = async (req, res, next) => {
  try {
    const p = periodFromQuery(req.query.period);
    const result = await dashboardService.getSalesDashboard(p);
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getInventoryStats: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getInventoryDashboard();
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

// ─── Purchase streaming ────────────────────────────────────────────────────

export const getPurchaseKpiSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseKpiSummary(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getPurchaseModuleCards: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseModuleCards(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getPurchaseTrend: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseTrend(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getPurchaseFunnel: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseFunnel(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getPurchaseTopPartners: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseTopPartners(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getPurchaseExceptions: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseExceptions(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// ─── Sales streaming ───────────────────────────────────────────────────────

export const getSalesKpiSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesKpiSummary(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getSalesModuleCards: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesModuleCards(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getSalesTrend: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesTrend(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getSalesFunnel: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesFunnel(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getSalesTopPartners: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesTopPartners(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getSalesExceptions: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesExceptions(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// ─── Inventory streaming ───────────────────────────────────────────────────

export const getInventoryKpiSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryKpiSummary(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getInventoryModuleCards: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryModuleCards(
      periodFromQuery(req.query.period),
    );
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getInventoryTrend: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryTrend(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getInventoryFunnel: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryFunnel(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getInventoryTopPartners: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryTopPartners(
      periodFromQuery(req.query.period),
    );
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const getInventoryExceptions: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getInventoryExceptions(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const dashboardDal = {
  getDashboardStats,
  getInventoryExceptions,
  getInventoryFunnel,
  getInventoryKpiSummary,
  getInventoryModuleCards,
  getInventoryStats,
  getInventoryTopPartners,
  getInventoryTrend,
  getPurchaseExceptions,
  getPurchaseFunnel,
  getPurchaseKpiSummary,
  getPurchaseModuleCards,
  getPurchaseStats,
  getPurchaseSummary,
  getPurchaseTopPartners,
  getPurchaseTrend,
  getSalesExceptions,
  getSalesFunnel,
  getSalesKpiSummary,
  getSalesModuleCards,
  getSalesStats,
  getSalesSummary,
  getSalesTopPartners,
  getSalesTrend,
  getSummary,
};
