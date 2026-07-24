// Dashboard controller: Overview ops desk payload.

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

export const dashboardController = {
  getOverviewDashboard,
};
