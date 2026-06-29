// Sales Quotation DAL: Handles HTTP requests for Sales Quotation operations.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { SalesQuotationQuery } from "@/dal/types/sales-quotation.types";
import { salesOrderService } from "@/services/sales-order.service"; // For getSalesEmployees
// Services
import { salesQuotationService } from "@/services/sales-quotation.service";
// Validation
import {
  CreateSalesQuotationInputSchema,
  UpdateSalesQuotationInputSchema,
} from "@/validation/schemas/inputs/sales-quotation.input";
import type { SalesQuotationDocNumLookupQuery } from "@/validation/schemas/inputs/sales-quotation.input";

// Fetches a list of sales quotations based on filters like customer name, quotation number, and date range.
export const getSalesQuotations = async (req: Request, res: Response, next: NextFunction) => {
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

    const result = await salesQuotationService.getSalesQuotations(dbName, filters);

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

export const getSalesQuotationDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    SalesQuotationDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await salesQuotationService.getSalesQuotationDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves the details of a single sales quotation from the SAP Service Layer.
export const getSalesQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Fetching Sales Quotation detail" });

    const data = await salesQuotationService.getSalesQuotation(sessionId, id as string);
    if (!data) {
      return res.status(404).json({ message: "Sales Quotation not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves sales quotation details by DocNum.
export const getSalesQuotationByDocNum = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;
    const { draftDocEntry } = authReq.query;

    logger.info({ docNum, draftDocEntry, msg: "Fetching Sales Quotation detail by DocNum" });

    const data = await salesQuotationService.getSalesQuotationByDocNum(
      sessionId,
      dbName,
      docNum as string,
      draftDocEntry ? String(draftDocEntry) : undefined,
    );
    if (!data) {
      return res.status(404).json({ message: "Sales Quotation not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Submits a new Sales Quotation to SAP B1.
export const createSalesQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Validate the incoming sales quotation payload against the Zod schema for SAP compatibility.
    const validatedPayload = CreateSalesQuotationInputSchema.parse(payload);

    logger.info({
      customer: validatedPayload.CardCode,
      msg: "Creating Sales Quotation",
    });

    const result = await salesQuotationService.createSalesQuotation(sessionId, validatedPayload);

    logger.info({ docNum: result.DocNum, msg: "Sales Quotation Created" });

    res.status(201).json({ data: result, message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Updates metadata for an existing sales quotation via SAP Service Layer PATCH.
export const updateSalesQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Filter and validate the update payload to ensure only permissible fields are sent to SAP.
    const validatedPayload = UpdateSalesQuotationInputSchema.parse(payload);

    logger.info({ id, msg: "Updating Sales Quotation" });

    const result = await salesQuotationService.updateSalesQuotation(
      sessionId,
      validatedPayload.draftDocEntry !== undefined
        ? String(validatedPayload.draftDocEntry)
        : (id as string),
      validatedPayload,
    );

    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Flags a sales quotation as cancelled within SAP B1.
export const cancelSalesQuotation = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Canceling Sales Quotation" });

    const result = await salesQuotationService.cancelSalesQuotation(sessionId, id as string);

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

export const getOpenSalesQuotationLines = async (
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
    const { sessionId: _sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { cardCode } = authReq.query;

    if (!cardCode) {
      return res.status(400).json({ message: "cardCode is required", success: false });
    }

    logger.info({ cardCode, msg: "Fetching Open Sales Quotation lines" });

    const data = await salesQuotationService.getOpenSalesQuotationLines(dbName, cardCode as string);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const salesQuotationDal = {
  cancelSalesQuotation,
  createSalesQuotation,
  getOpenSalesQuotationLines,
  getSalesEmployees,
  getSalesQuotation,
  getSalesQuotationByDocNum,
  getSalesQuotationDocNums,
  getSalesQuotations,
  updateSalesQuotation,
};
