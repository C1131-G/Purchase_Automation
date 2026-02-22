// Outgoing Payment DAL: Handles HTTP requests for Outgoing Payment (Vendor Payment) operations.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PaymentQuery } from "@/dal/types/outgoing-payment.types";
// Services
import { outgoingPaymentService } from "@/services/outgoing-payment.service";
// Validation
import {
  CreatePaymentInputSchema,
  type PaymentDocNumLookupQuery,
  UpdatePaymentInputSchema,
} from "@/validation/schemas/inputs/payments.input";

// Retrieves a list of outgoing payments filtered by vendor name, payment number, and date range.
export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PaymentQuery
  >;
  try {
    const { dbName } = authReq.user;
    // Query is already validated/sanitized by validateQuery(PaymentQuerySchema) middleware.
    const filters = authReq.query;

    logger.info({ msg: "Fetching Outgoing Payments", dbName, filters });

    const result = await outgoingPaymentService.getPayments(dbName, filters);

    logger.info({
      msg: "Fetched Outgoing Payments",
      count: result.data.length,
      total: result.total,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getPaymentDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PaymentDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await outgoingPaymentService.getPaymentDocNums(dbName, search, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Fetches the detailed view of a single outgoing payment from SAP B1 via Service Layer.
export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching Outgoing Payment detail", id });

    const data = await outgoingPaymentService.getPayment(sessionId, id as string);
    if (!data)
      return res.status(404).json({ success: false, message: "Outgoing Payment not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Orchestrates the creation of a new Outgoing Payment record in SAP B1.
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Validate the incoming payment payload ensures compliance with SAP's data structure requirements.
    const validatedPayload = CreatePaymentInputSchema.parse(payload);

    logger.info({ msg: "Creating Outgoing Payment", vendor: validatedPayload.CardCode });

    const result = await outgoingPaymentService.createPayment(sessionId, validatedPayload);

    logger.info({ msg: "Outgoing Payment Created", docNum: result.DocNum });

    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

// Updates metadata (primarily internal comments) for an existing outgoing payment.
export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Validate the update payload to prevent sending non-patchable fields to SAP.
    const validatedPayload = UpdatePaymentInputSchema.parse(payload);

    logger.info({ msg: "Updating Outgoing Payment", id });

    const result = await outgoingPaymentService.updatePayment(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

// Triggers the cancellation process for an outgoing payment in the SAP system.
export const cancelPayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Cancelling Outgoing Payment", id });

    const result = await outgoingPaymentService.cancelPayment(sessionId, id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const outgoingPaymentDal = {
  getPayments,
  getPaymentDocNums,
  getPayment,
  createPayment,
  updatePayment,
  cancelPayment,
};
