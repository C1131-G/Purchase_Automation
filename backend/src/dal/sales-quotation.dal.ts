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
  type SalesQuotationDocNumLookupQuery,
  UpdateSalesQuotationInputSchema,
} from "@/validation/schemas/inputs/sales-quotation.input";

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

    logger.info({ msg: "Fetching Sales Quotations", dbName, filters });

    const result = await salesQuotationService.getSalesQuotations(dbName, filters);

    logger.info({
      msg: "Fetched Sales Quotations",
      count: result.data.length,
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
    res.status(200).json({ success: true, data });
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

    logger.info({ msg: "Fetching Sales Quotation detail", id });

    const data = await salesQuotationService.getSalesQuotation(sessionId, id as string);
    if (!data)
      return res.status(404).json({ success: false, message: "Sales Quotation not found" });
    res.status(200).json({ success: true, data });
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

    logger.info({ msg: "Fetching Sales Quotation detail by DocNum", docNum });

    const data = await salesQuotationService.getSalesQuotationByDocNum(
      sessionId,
      dbName,
      docNum as string,
    );
    if (!data)
      return res.status(404).json({ success: false, message: "Sales Quotation not found" });
    res.status(200).json({ success: true, data });
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

    logger.info({ msg: "Creating Sales Quotation", customer: validatedPayload.CardCode });

    const result = await salesQuotationService.createSalesQuotation(sessionId, validatedPayload);

    logger.info({ msg: "Sales Quotation Created", docNum: result.DocNum });

    res.status(201).json({ success: true, message: result.message, data: result });
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

    logger.info({ msg: "Updating Sales Quotation", id });

    const result = await salesQuotationService.updateSalesQuotation(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ success: true, message: result.message });
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

    logger.info({ msg: "Canceling Sales Quotation", id });

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
    res.status(200).json({ success: true, data });
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
      return res.status(400).json({ success: false, message: "cardCode is required" });
    }

    logger.info({ msg: "Fetching Open Sales Quotation lines", cardCode });

    const data = await salesQuotationService.getOpenSalesQuotationLines(dbName, cardCode as string);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const salesQuotationDal = {
  getSalesQuotations,
  getSalesQuotationDocNums,
  getSalesQuotation,
  getSalesQuotationByDocNum,
  createSalesQuotation,
  updateSalesQuotation,
  cancelSalesQuotation,
  getSalesEmployees,
  getOpenSalesQuotationLines,
};
