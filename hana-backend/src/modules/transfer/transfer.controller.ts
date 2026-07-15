import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "@/types/express.types";
import { transferService } from "./transfer.service";
import type { TransferQuery, TransferDocNumLookupQuery } from "./transfer.schema";

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

    const transfersResult = await transferService.getTransfers(dbName, filters);

    res.status(200).json({ success: true, ...transfersResult });
  } catch (error) {
    next(error);
  }
};

export const getTransfer = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    const documentByDocNum = await transferService.getTransferByDocNum(dbName, id as string);

    if (!documentByDocNum) {
      return res.status(404).json({ message: "Transfer not found", success: false });
    }

    res.status(200).json({ data: documentByDocNum, success: true });
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

    const docNumSuggestions = await transferService.getTransferDocNums(dbName, search, limit);

    res.status(200).json({ data: docNumSuggestions, success: true });
  } catch (error) {
    next(error);
  }
};

export const transferController = {
  getTransfers,
  getTransfer,
  getTransferDocNums,
};
