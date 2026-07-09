// A/R Invoice DAL: Handles HTTP requests for A/R Invoice operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { InvoiceQuery } from "@/dal/types/ar-invoice.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { arInvoiceService } from "@/services/ar-invoice.service";
import {
  CreateInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@/validation/schemas/inputs/invoice.input";
import type { InvoiceDocNumLookupQuery } from "@/validation/schemas/inputs/invoice.input";

// Fetches all A/R Invoices based on client-provided filters like invoice number, customer name, date range, etc.
export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    InvoiceQuery
  >;
  try {
    const { dbName } = authReq.user;
    // Query is already validated/sanitized by validateQuery(InvoiceQuerySchema) middleware.
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching A/R Invoices" });

    const result = await arInvoiceService.getInvoices(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched A/R Invoices",
      total: result.total,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    InvoiceDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await arInvoiceService.getInvoiceDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves a specific A/R Invoice's details from the SAP Service Layer using its ID.
export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const draftDocEntry = (req.query.draftDocEntry as string) || undefined;

    logger.info({ id, draftDocEntry, msg: "Fetching A/R Invoice detail" });

    const data = await arInvoiceService.getInvoice(
      sessionId,
      id as string,
      draftDocEntry ? true : false,
    );
    if (!data) {
      return res.status(404).json({ message: "A/R Invoice not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Creates a new A/R Invoice in SAP B1.
export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Zod validation ensures the payload adheres to the required SAP format for A/R Invoices.
    const validatedPayload = CreateInvoiceInputSchema.parse(payload);

    const { dbName } = authReq.user;

    logger.info({
      customer: validatedPayload.CardCode,
      msg: "Creating AR Invoice",
    });

    const result = await arInvoiceService.createInvoice(sessionId, validatedPayload, dbName);

    logger.info({ docNum: result.DocNum, msg: "A/R Invoice Created" });

    res.status(201).json({ data: result, message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Updates an existing A/R Invoice's metadata (primarily comments) via Service Layer PATCH.
export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Validate the update payload to prevent sending invalid data to SAP.
    const validatedPayload = UpdateInvoiceInputSchema.parse(payload);

    logger.info({ id, msg: "Updating A/R Invoice" });

    const result = await arInvoiceService.updateInvoice(sessionId, id as string, validatedPayload);
    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Flags an A/R Invoice as cancelled in the SAP system.
export const cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Cancelling A/R Invoice" });

    const result = await arInvoiceService.cancelInvoice(sessionId, id as string);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Reopens an A/R Invoice in the SAP system.
export const reopenInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Reopening A/R Invoice" });

    const result = await arInvoiceService.reopenInvoice(sessionId, id as string);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const arInvoiceDal = {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoiceDocNums,
  getInvoices,
  reopenInvoice,
  updateInvoice,
};
