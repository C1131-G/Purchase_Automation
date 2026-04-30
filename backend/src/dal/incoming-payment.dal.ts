// Incoming Payment DAL: Handles HTTP requests for Incoming Payment operations.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PaymentQuery } from "@/dal/types/incoming-payment.types";
// Services
import { incomingPaymentService } from "@/services/incoming-payment.service";
// Validation
import {
  CreatePaymentInputSchema,
  type PaymentDocNumLookupQuery,
  UpdatePaymentInputSchema,
} from "@/validation/schemas/inputs/payments.input";

// Retrieves a list of incoming payments based on filters like customer name and date range.
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

    logger.info({ msg: "Fetching Incoming Payments", dbName, filters });

    const result = await incomingPaymentService.getPayments(dbName, filters);

    logger.info({
      msg: "Fetched Incoming Payments",
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
    const data = await incomingPaymentService.getPaymentDocNums(dbName, search, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Fetches the detailed information for a single incoming payment from SAP.
export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching Incoming Payment detail", id });

    const data = await incomingPaymentService.getPayment(sessionId, id as string);
    if (!data)
      return res.status(404).json({ success: false, message: "Incoming Payment not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Fetches the detailed information for a single incoming payment by its Document Number.
export const getPaymentByDocNum = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;

    logger.info({ msg: "Fetching Incoming Payment detail by DocNum", docNum });

    const data = await incomingPaymentService.getPaymentByDocNum(
      sessionId,
      dbName,
      docNum as string,
    );
    if (!data)
      return res.status(404).json({ success: false, message: "Incoming Payment not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Processes the creation of a new Incoming Payment record in SAP B1.
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Validate the payment payload against the schema to ensure all SAP requirements are met.
    const validatedPayload = CreatePaymentInputSchema.parse(payload);

    logger.info({ msg: "Creating Incoming Payment", customer: validatedPayload.CardCode });

    const result = await incomingPaymentService.createPayment(sessionId, validatedPayload);

    logger.info({ msg: "Incoming Payment Created", docNum: result.DocNum });

    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

// Updates metadata (e.g., internal comments) for an existing incoming payment via PATCH.
export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Ensure the update request only contains valid fields for modification in SAP.
    const validatedPayload = UpdatePaymentInputSchema.parse(payload);

    logger.info({ msg: "Updating Incoming Payment", id });

    const result = await incomingPaymentService.updatePayment(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

// Cancels an incoming payment in the SAP system.
export const cancelPayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Cancelling Incoming Payment", id });

    const result = await incomingPaymentService.cancelPayment(sessionId, id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const incomingPaymentDal = {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  createPayment,
  updatePayment,
  cancelPayment,
};
