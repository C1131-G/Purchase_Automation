// A/P Invoice Controller: Handles HTTP requests for A/P Invoice operations.

import type { NextFunction, Request, Response } from "express";

import type { InvoiceQuery } from "./ap-invoice.types";
import type { AuthenticatedRequest } from "@/types/express.types";
import { requirePortalCreatedBy } from "@/modules/auth/portal-created-by";
import { apInvoiceService } from "./ap-invoice.service";
import { CreateInvoiceInputSchema, UpdateInvoiceInputSchema } from "./ap-invoice.schema";
import type { InvoiceDocNumLookupQuery } from "./ap-invoice.schema";

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

    const result = await apInvoiceService.getInvoices(dbName, filters);

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
    const data = await apInvoiceService.getInvoiceDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves detailed information for a specific A/P Invoice from the Service Layer.
export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;
    const draftDocEntry = (req.query.draftDocEntry as string) || undefined;

    const data = await apInvoiceService.getInvoiceByDocNum(
      sessionId,
      dbName,
      id as string,
      draftDocEntry,
    );

    if (!data) {
      return res.status(404).json({ message: "A/P Invoice not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Creates a new A/P Invoice in SAP B1.
export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const payload = req.body;

    // Validate the payload against the creation schema.
    const validatedPayload = CreateInvoiceInputSchema.parse(payload);

    const result = await apInvoiceService.createInvoice(
      sessionId,
      validatedPayload,
      dbName,
      requirePortalCreatedBy(authReq.session),
    );

    res.status(201).json({ data: result, message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Updates an existing A/P Invoice (typically comments). Handled via Service Layer PATCH.
export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;
    const payload = req.body;

    // Zod Body Validation ensures only allowed fields are passed to SAP.
    const validatedPayload = UpdateInvoiceInputSchema.parse(payload);

    const isDraft = validatedPayload.isDraft === true || Boolean(validatedPayload.draftDocEntry);
    let targetDocEntry: string;

    if (isDraft) {
      targetDocEntry = String(validatedPayload.draftDocEntry || id);
    } else {
      const detail = await apInvoiceService.getInvoiceByDocNum(sessionId, dbName, id as string);
      targetDocEntry = String(detail.id);
    }

    // Note: getInvoiceByDocNum returns the full detail including internal DocEntry (detail.id)
    const updateResult = await apInvoiceService.updateInvoice(
      sessionId,
      targetDocEntry,
      validatedPayload,
    );

    res.status(200).json({ message: updateResult.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Flags an A/P Invoice as cancelled in SAP B1.
export const cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    const detail = await apInvoiceService.getInvoiceByDocNum(sessionId, dbName, id as string);
    const result = await apInvoiceService.cancelInvoice(sessionId, String(detail.id));
    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Reopens an A/P Invoice in the SAP system.
export const reopenInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    const result = await apInvoiceService.reopenInvoice(sessionId, id as string);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const apInvoiceController = {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoiceDocNums,
  getInvoices,
  reopenInvoice,
  updateInvoice,
};
