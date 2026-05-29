// Purchase Quotation DAL: Manages HTTP requests for Purchase Quotation operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PurchaseQuotationQuery } from "@/dal/types/purchase-quotation.types";
import { purchaseQuotationService } from "@/services/purchase-quotation.service";
import { CreatePurchaseQuotationInputSchema } from "@/validation/schemas/inputs/purchase-quotation.input";
import type { PurchaseQuotationDocNumLookupQuery } from "@/validation/schemas/inputs/purchase-quotation.input";

export const getQuotations = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PurchaseQuotationQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching Purchase Quotations" });

    const result = await purchaseQuotationService.getQuotations(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched Purchase Quotations",
      total: result.total,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getQuotationDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PurchaseQuotationDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await purchaseQuotationService.getQuotationDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Purchase Quotation detail" });

    const data = await purchaseQuotationService.getQuotation(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Purchase Quotation not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const _authReq = req as unknown as AuthenticatedRequest;
  try {
    const payload = req.body;
    CreatePurchaseQuotationInputSchema.parse(payload);

    logger.info({
      vendor: (payload as Record<string, unknown>).CardCode,
      msg: "Creating Purchase Quotation",
    });

    res.status(201).json({
      data: payload,
      message: "Quotation created (stub)",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseQuotationDal = {
  createQuotation,
  getQuotation,
  getQuotationDocNums,
  getQuotations,
};
