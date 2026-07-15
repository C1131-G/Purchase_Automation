// Dashboard Controller: Handles HTTP requests for aggregate data summaries displayed on the user dashboard.

import type { NextFunction, Request, Response } from "express";

// Core
import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";
import type { AuthenticatedRequest } from "@/types/express.types";
// Services
import { dashboardService } from "./dashboard.service";

// Original combined stats fetcher (backward compatibility)

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
    const inventoryExceptionsResult = await dashboardService.getInventoryExceptions(period, dbName);
    res.status(200).json({ success: true, ...inventoryExceptionsResult });
  } catch (error) {
    next(error);
  }
};
