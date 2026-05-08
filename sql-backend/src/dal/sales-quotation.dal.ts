// Sales Quotation DAL: Manages HTTP requests for Sales Quotation operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { SalesQuotationQuery } from "@/dal/types/sales-quotation.types";
import { salesQuotationService } from "@/services/sales-quotation.service";
import { CreateSalesQuotationInputSchema } from "@/validation/schemas/inputs/sales-quotation.input";
import type { SalesQuotationDocNumLookupQuery } from "@/validation/schemas/inputs/sales-quotation.input";

export const getQuotations = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    SalesQuotationQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching Sales Quotations" });

    const result = await salesQuotationService.getQuotations(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched Sales Quotations",
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
    SalesQuotationDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await salesQuotationService.getQuotationDocNums(dbName, search, limit);
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

    logger.info({ dbName, id, msg: "Fetching Sales Quotation detail" });

    const data = await salesQuotationService.getQuotation(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Sales Quotation not found", success: false });
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
    CreateSalesQuotationInputSchema.parse(payload);

    logger.info({
      customer: (payload as Record<string, unknown>).CardCode,
      msg: "Creating Sales Quotation",
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

export const salesQuotationDal = {
  createQuotation,
  getQuotation,
  getQuotationDocNums,
  getQuotations,
};
