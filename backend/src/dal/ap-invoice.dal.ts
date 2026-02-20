// A/P Invoice DAL: Handles HTTP requests for A/P Invoice operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { InvoiceQuery } from "@/dal/types/ap-invoice.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { apInvoiceService } from "@/services/ap-invoice.service";
import {
  CreateInvoiceInputSchema,
  type InvoiceDocNumLookupQuery,
  UpdateInvoiceInputSchema,
} from "@/validation/schemas/inputs/invoice.input";

// Fetches all A/P Invoices based on user-provided filters and pagination settings.
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

    logger.info({ msg: "Fetching A/P Invoices", dbName, filters });

    const result = await apInvoiceService.getInvoices(dbName, filters);

    logger.info({ msg: "Fetched A/P Invoices", count: result.data.length, total: result.total });

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
    const { search } = authReq.query;
    const data = await apInvoiceService.getInvoiceDocNums(dbName, search);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retrieves detailed information for a specific A/P Invoice from the Service Layer.
export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching A/P Invoice detail", id });

    const data = await apInvoiceService.getInvoice(sessionId, id as string);

    if (!data) return res.status(404).json({ success: false, message: "A/P Invoice not found" });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Creates a new A/P Invoice in SAP B1.
export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.session;
    const payload = req.body;

    // Validate the payload against the creation schema.
    const validatedPayload = CreateInvoiceInputSchema.parse(payload);

    logger.info({ msg: "Creating AP Invoice", vendor: validatedPayload.CardCode });

    const result = await apInvoiceService.createInvoice(sessionId, validatedPayload);

    logger.info({ msg: "A/P Invoice Created", docNum: result.DocNum });

    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

// Updates an existing A/P Invoice (typically comments). Handled via Service Layer PATCH.
export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Zod Body Validation ensures only allowed fields are passed to SAP.
    const validatedPayload = UpdateInvoiceInputSchema.parse(payload);

    logger.info({ msg: "Updating A/P Invoice", id: id as string });

    const result = await apInvoiceService.updateInvoice(sessionId, id as string, validatedPayload);

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

// Flags an A/P Invoice as cancelled in SAP B1.
export const cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Cancelling A/P Invoice", id });

    const result = await apInvoiceService.cancelInvoice(sessionId, id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const apInvoiceDal = {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
};
