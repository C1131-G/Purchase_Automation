// Bank Details DAL: Read-only HTTP layer for bank master data lookups.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { bankDetailsService } from "@/services/bank-details.service";
import type { MasterDataQuery } from "@/validation/schemas/inputs/master-data.input";

export const getBankDetails = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    MasterDataQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    logger.info({ dbName, search, limit, msg: "Fetching bank details" });
    const result = await bankDetailsService.getBankDetails(dbName, { search, limit });
    res.status(200).json({ data: result.data, success: true, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const bankDetailsDal = {
  getBankDetails,
};
