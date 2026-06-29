// Purchase Quotation DAL: Handles HTTP requests for Purchase Quotation operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PurchaseQuotationQuery } from "@/dal/types/purchase-quotation.types";
import { purchaseQuotationService } from "@/services/purchase-quotation.service";
import { salesOrderService } from "@/services/sales-order.service";
import {
  CreatePurchaseQuotationInputSchema,
  UpdatePurchaseQuotationInputSchema,
} from "@/validation/schemas/inputs/purchase-quotation.input";
import type { PurchaseQuotationDocNumLookupQuery } from "@/validation/schemas/inputs/purchase-quotation.input";

// Fetches a list of purchase quotations based on filters like vendor name, quotation number, and date range.
export const getPurchaseQuotations = async (req: Request, res: Response, next: NextFunction) => {
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

    const result = await purchaseQuotationService.getPurchaseQuotations(dbName, filters);

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

export const getPurchaseQuotationDocNums = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PurchaseQuotationDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await purchaseQuotationService.getPurchaseQuotationDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves the details of a single purchase quotation from the SAP Service Layer.
export const getPurchaseQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Fetching Purchase Quotation detail" });

    const data = await purchaseQuotationService.getPurchaseQuotation(sessionId, id as string);
    if (!data) {
      return res.status(404).json({ message: "Purchase Quotation not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves purchase quotation details by DocNum.
export const getPurchaseQuotationByDocNum = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;
    const draftDocEntry = req.query.draftDocEntry as string | undefined;

    logger.info({ docNum, draftDocEntry, msg: "Fetching Purchase Quotation detail by DocNum" });

    const data = await purchaseQuotationService.getPurchaseQuotationByDocNum(
      sessionId,
      dbName,
      docNum as string,
      draftDocEntry,
    );
    if (!data) {
      return res.status(404).json({ message: "Purchase Quotation not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Submits a new Purchase Quotation to SAP B1.
export const createPurchaseQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId, dbName } = authReq.session;
    const payload = req.body;

    const validatedPayload = CreatePurchaseQuotationInputSchema.parse(payload);

    logger.info({
      vendor: validatedPayload.CardCode,
      msg: "Creating Purchase Quotation",
    });

    const result = await purchaseQuotationService.createPurchaseQuotation(
      sessionId,
      validatedPayload,
      dbName,
    );

    logger.info({ docNum: result.DocNum, msg: "Purchase Quotation Created" });

    res.status(201).json({ data: result, message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Updates metadata for an existing purchase quotation via SAP Service Layer PATCH.
export const updatePurchaseQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    const validatedPayload = UpdatePurchaseQuotationInputSchema.parse(payload);

    logger.info({ id, msg: "Updating Purchase Quotation" });

    const result = await purchaseQuotationService.updatePurchaseQuotation(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Flags a purchase quotation as cancelled within SAP B1.
export const cancelPurchaseQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Canceling Purchase Quotation" });

    const result = await purchaseQuotationService.cancelPurchaseQuotation(sessionId, id as string);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Fetches a list of all sales employees available in the tenant database.
export const getSalesEmployees = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const data = await salesOrderService.getSalesEmployees(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getOpenPurchaseQuotationLines = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { cardCode?: string }
  >;
  try {
    const { dbName } = authReq.user;
    const { cardCode } = authReq.query;

    if (!cardCode) {
      return res.status(400).json({ message: "cardCode is required", success: false });
    }

    logger.info({ cardCode, msg: "Fetching Open Purchase Quotation lines" });

    const data = await purchaseQuotationService.getOpenPurchaseQuotationLines(
      dbName,
      cardCode as string,
    );
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const purchaseQuotationDal = {
  cancelPurchaseQuotation,
  createPurchaseQuotation,
  getOpenPurchaseQuotationLines,
  getPurchaseQuotation,
  getPurchaseQuotationByDocNum,
  getPurchaseQuotationDocNums,
  getPurchaseQuotations,
  getSalesEmployees,
  updatePurchaseQuotation,
};
