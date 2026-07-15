// Incoming Payment Controller: Handles HTTP requests for Incoming Payment operations.

import type { NextFunction, Request, Response } from "express";

// Core
import type { AuthenticatedRequest } from "@/types/express.types";
import type { PaymentQuery } from "./incoming-payment.types";
// Services
import { incomingPaymentService } from "./incoming-payment.service";
// Validation
import { CreatePaymentInputSchema, UpdatePaymentInputSchema } from "./incoming-payment.schema";
import type { PaymentDocNumLookupQuery } from "./incoming-payment.schema";

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

    const result = await incomingPaymentService.getPayments(dbName, filters);

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
    res.status(200).json({ data, success: true });
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

    const data = await incomingPaymentService.getPayment(sessionId, id as string);
    if (!data) {
      return res.status(404).json({ message: "Incoming Payment not found", success: false });
    }
    res.status(200).json({ data, success: true });
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

    const data = await incomingPaymentService.getPaymentByDocNum(
      sessionId,
      dbName,
      docNum as string,
    );
    if (!data) {
      return res.status(404).json({ message: "Incoming Payment not found", success: false });
    }
    res.status(200).json({ data, success: true });
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

    const result = await incomingPaymentService.createPayment(sessionId, validatedPayload);

    res.status(201).json({ data: result, message: result.message, success: true });
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

    const result = await incomingPaymentService.updatePayment(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ message: result.message, success: true });
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

    const result = await incomingPaymentService.cancelPayment(sessionId, id as string);
    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { search?: string; limit?: number }
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const result = await incomingPaymentService.getAccounts(dbName, { search, limit });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const incomingPaymentController = {
  getAccounts,
  cancelPayment,
  createPayment,
  getPayment,
  getPaymentByDocNum,
  getPaymentDocNums,
  getPayments,
  updatePayment,
};
