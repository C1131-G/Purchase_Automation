// Dashboard controller: Overview ops desk payload + AR draft pages.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/types/express.types";
import { dashboardService } from "./dashboard.service";

export const getOverviewDashboard = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const overview = await dashboardService.getOverviewDashboard(dbName);
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

export const getArInvoiceDrafts = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const offset = req.query.offset != null ? Number(req.query.offset) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const page = await dashboardService.getArInvoiceDraftsPage(dbName, { limit, offset });
    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

export const dashboardController = {
  getOverviewDashboard,
  getArInvoiceDrafts,
};
