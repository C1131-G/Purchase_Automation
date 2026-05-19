// Financial Period DAL: Read-only HTTP layer for active financial period lookups.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { financialPeriodService } from "@/services/financial-period.service";
import { z } from "zod";

const resolveTransferAccountSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export const getActivePeriod = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ dbName, msg: "Fetching active financial period" });
    const result = await financialPeriodService.getActivePeriod(dbName);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const resolveTransferAccount = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const parsed = resolveTransferAccountSchema.parse(req.query);

    logger.info({ dbName, date: parsed.date, msg: "Resolving transfer account by date" });
    const linkAct12 = await financialPeriodService.getLinkAct12ByDate(dbName, parsed.date);

    if (!linkAct12) {
      return res.status(404).json({
        data: null,
        message: "No financial period found for the selected date",
        success: false,
      });
    }

    res.status(200).json({ data: { TransferAccount: linkAct12 }, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        data: null,
        message: error.errors[0]?.message || "Invalid date format",
        success: false,
      });
    }
    next(error);
  }
};

export const financialPeriodDal = {
  getActivePeriod,
  resolveTransferAccount,
};
