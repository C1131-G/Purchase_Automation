import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { goodsIssueService } from "@/services/goods-issue.service";
import type {
  GoodsIssueQuery,
  GoodsIssueDocNumLookupQuery,
} from "@/validation/schemas/inputs/goods-issue.input";

export const getGoodsIssues = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    GoodsIssueQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching Goods Issues" });

    const result = await goodsIssueService.getGoodsIssues(dbName, filters);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getGoodsIssue = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Goods Issue detail" });

    const data = await goodsIssueService.getGoodsIssueByDocNum(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Goods Issue not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getGoodsIssueDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    GoodsIssueDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const data = await goodsIssueService.getGoodsIssueDocNums(dbName, search, limit);

    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const goodsIssueDal = {
  getGoodsIssues,
  getGoodsIssue,
  getGoodsIssueDocNums,
};
