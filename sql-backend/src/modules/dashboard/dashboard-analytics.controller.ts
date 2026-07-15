import type { RequestHandler } from "express";

import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";

import { dashboardService } from "./dashboard.service";

const periodFromQuery = (p: unknown): DashboardPeriod => {
  if (p === "week" || p === "month" || p === "year" || p === "all") {
    return p;
  }
  if (p === "weekly") {
    return "week";
  }
  if (p === "yearly") {
    return "year";
  }
  return "month";
};

export const getPurchaseKpiSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseKpiSummary(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getPurchaseModuleCards: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseModuleCards(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getPurchaseTrend: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseTrend(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getPurchaseFunnel: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseFunnel(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getPurchaseTopPartners: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseTopPartners(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getPurchaseExceptions: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getPurchaseExceptions(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getSalesKpiSummary: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesKpiSummary(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getSalesModuleCards: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesModuleCards(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getSalesTrend: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesTrend(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getSalesFunnel: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesFunnel(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getSalesTopPartners: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesTopPartners(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getSalesExceptions: RequestHandler = async (req, res, next) => {
  try {
    const result = await dashboardService.getSalesExceptions(periodFromQuery(req.query.period));
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};
