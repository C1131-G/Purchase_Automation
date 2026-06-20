import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { transferService } from "@/services/transfer.service";
import type {
  TransferQuery,
  TransferDocNumLookupQuery,
} from "@/validation/schemas/inputs/transfer.input";

export const getTransfers = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    TransferQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching Transfers" });

    const result = await transferService.getTransfers(dbName, filters);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getTransfer = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Transfer detail" });

    const data = await transferService.getTransferByDocNum(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Transfer not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getTransferDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    TransferDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    logger.info({ dbName, search, limit, msg: "Fetching Transfer DocNum suggestions" });

    const data = await transferService.getTransferDocNums(dbName, search, limit);

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const transferDal = {
  getTransfers,
  getTransfer,
  getTransferDocNums,
};
