import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { goodsReceiptService } from "@/services/goods-receipt.service";
import type {
  GoodsReceiptQuery,
  GoodsReceiptDocNumLookupQuery,
} from "@/validation/schemas/inputs/goods-receipt.input";

export const getGoodsReceipts = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    GoodsReceiptQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching Goods Receipts" });

    const result = await goodsReceiptService.getGoodsReceipts(dbName, filters);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getGoodsReceipt = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Goods Receipt detail" });

    const data = await goodsReceiptService.getGoodsReceiptByDocNum(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Goods Receipt not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getGoodsReceiptDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    GoodsReceiptDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    logger.info({ dbName, search, limit, msg: "Fetching Goods Receipt DocNum suggestions" });

    const data = await goodsReceiptService.getGoodsReceiptDocNums(dbName, search, limit);

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const createGoodsReceipt = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId, dbName } = authReq.user;
    const payload = req.body as Record<string, unknown>;

    logger.info({ dbName, msg: "Creating Goods Receipt" });

    const result = await goodsReceiptService.createGoodsReceipt(sessionId, payload);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const goodsReceiptDal = {
  getGoodsReceipts,
  getGoodsReceipt,
  getGoodsReceiptDocNums,
  createGoodsReceipt,
};
