// Bank Details Controller: Read-only HTTP layer for bank master data lookups.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/types/express.types";
import { bankDetailsService } from "./bank-details.service";
import type { MasterDataQuery } from "./bank-details.schema";

export const getBankDetails = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    MasterDataQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit, country } = authReq.query;
    const bankDetailsResult = await bankDetailsService.getBankDetails(dbName, {
      search,
      limit,
      country,
    });
    res
      .status(200)
      .json({ data: bankDetailsResult.data, success: true, total: bankDetailsResult.total });
  } catch (error) {
    next(error);
  }
};

export const bankDetailsController = {
  getBankDetails,
};
