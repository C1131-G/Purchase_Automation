// Dashboard DAL: Handles dashboard data access.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { dashboardService } from "@/services/dashboard.service";

export const getPurchaseSummary = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { dbName } = authReq.user;

    const data = await dashboardService.getPurchaseSummary(dbName);

    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesSummary = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { dbName } = authReq.user;

    const data = await dashboardService.getSalesSummary(dbName);

    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { dbName } = authReq.user;

    const data = await dashboardService.getStats(dbName);

    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const dashboardDal = {
  getPurchaseSummary,
  getSalesSummary,
  getStats,
};
