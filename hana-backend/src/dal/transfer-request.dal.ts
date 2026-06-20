import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { transferRequestService } from "@/services/transfer-request.service";
import type {
  TransferRequestDocNumLookupQuery,
  TransferRequestQuery,
} from "@/validation/schemas/inputs/transfer-request.input";

export const getTransferRequests = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    TransferRequestQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching Transfer Requests" });

    const result = await transferRequestService.getTransferRequests(dbName, filters);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getTransferRequest = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Transfer Request detail" });

    const data = await transferRequestService.getTransferRequestByDocNum(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Transfer Request not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getTransferRequestDocNums = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    TransferRequestDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    logger.info({ dbName, search, limit, msg: "Fetching Transfer Request doc numbers" });

    const data = await transferRequestService.getTransferRequestDocNums(dbName, search, limit);

    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const transferRequestDal = {
  getTransferRequests,
  getTransferRequest,
  getTransferRequestDocNums,
};
