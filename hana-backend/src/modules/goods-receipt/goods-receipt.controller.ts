import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "@/types/express.types";
import { goodsReceiptService } from "./goods-receipt.service";
import type { GoodsReceiptQuery, GoodsReceiptDocNumLookupQuery } from "./goods-receipt.schema";

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

    const result = await goodsReceiptService.getGoodsReceipts(dbName, filters);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getGoodsReceipt = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName, sessionId } = authReq.user;
    const { id } = authReq.params;

    const data = await goodsReceiptService.getGoodsReceiptByDocNum(sessionId, dbName, id as string);

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

    const data = await goodsReceiptService.getGoodsReceiptDocNums(dbName, search, limit);

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const createGoodsReceipt = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.user;
    const payload = req.body as Record<string, unknown>;

    const result = await goodsReceiptService.createGoodsReceipt(sessionId, payload);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateGoodsReceipt = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.user;
    const { id } = authReq.params;
    const payload = req.body as Record<string, unknown>;

    const result = await goodsReceiptService.updateGoodsReceipt(sessionId, id as string, payload);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const goodsReceiptController = {
  getGoodsReceipts,
  getGoodsReceipt,
  getGoodsReceiptDocNums,
  createGoodsReceipt,
  updateGoodsReceipt,
};
