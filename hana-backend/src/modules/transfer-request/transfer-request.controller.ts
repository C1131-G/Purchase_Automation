import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "@/types/express.types";
import { transferRequestService } from "./transfer-request.service";
import type {
  TransferRequestDocNumLookupQuery,
  TransferRequestQuery,
} from "./transfer-request.schema";

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

    const transferRequestsResult = await transferRequestService.getTransferRequests(
      dbName,
      filters,
    );

    res.status(200).json({ success: true, ...transferRequestsResult });
  } catch (error) {
    next(error);
  }
};

export const getTransferRequest = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    const documentByDocNum = await transferRequestService.getTransferRequestByDocNum(
      dbName,
      id as string,
    );

    if (!documentByDocNum) {
      return res.status(404).json({ message: "Transfer Request not found", success: false });
    }

    res.status(200).json({ data: documentByDocNum, success: true });
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

    const docNumSuggestions = await transferRequestService.getTransferRequestDocNums(
      dbName,
      search,
      limit,
    );

    res.status(200).json({
      docNumSuggestions,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const transferRequestController = {
  getTransferRequests,
  getTransferRequest,
  getTransferRequestDocNums,
};
