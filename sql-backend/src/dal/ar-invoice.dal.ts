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

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    InvoiceQuery
  >;
  try {
    const { dbName } = authReq.user;
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

export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching A/R Invoice detail" });

    const data = await arInvoiceService.getInvoice(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "A/R Invoice not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const _authReq = req as unknown as AuthenticatedRequest;
  try {
    const payload = req.body;
    CreateInvoiceInputSchema.parse(payload);

    logger.info({
      customer: (payload as Record<string, unknown>).CardCode,
      msg: "Creating A/R Invoice",
    });

    res.status(201).json({
      data: payload,
      message: "Invoice created (stub)",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (_req: Request, res: Response, next: NextFunction) => {
  const _authReq = _req as unknown as AuthenticatedRequest;
  try {
    const payload = _req.body;
    UpdateInvoiceInputSchema.parse(payload);

    logger.info({ id: payload.id as string, msg: "Updating A/R Invoice" });

    res.status(200).json({ message: "Invoice updated (stub)", success: true });
  } catch (error) {
    next(error);
  }
};

export const cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { id } = authReq.params;

    logger.info({ id, msg: "Cancelling A/R Invoice" });

    res.status(200).json({ message: "Invoice cancelled (stub)", success: true });
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
  updateInvoice,
};
