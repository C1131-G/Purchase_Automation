// Outgoing Payment Controller: Handles HTTP requests for Outgoing Payment (Vendor Payment) operations.

import type { NextFunction, Request, Response } from "express";

// Core
import type { AuthenticatedRequest } from "@/types/express.types";
import type { PaymentQuery } from "./outgoing-payment.types";
import type { AccountQuery } from "./outgoing-payment-account.types";
// Services
import { outgoingPaymentService } from "./outgoing-payment.service";
// Validation
import { CreatePaymentInputSchema, UpdatePaymentInputSchema } from "./outgoing-payment.schema";
import type { PaymentDocNumLookupQuery } from "./outgoing-payment.schema";

// Retrieves a list of outgoing payments from HANA.
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

    const result = await outgoingPaymentService.getPayments(dbName, filters);

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
    res.status(200).json({ data, success: true });
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

    const data = await outgoingPaymentService.getPayment(sessionId, id as string);
    if (!data) {
      return res.status(404).json({ message: "Outgoing Payment not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Fetches the detailed information for a single outgoing payment by its Document Number.
export const getPaymentByDocNum = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;

    const data = await outgoingPaymentService.getPaymentByDocNum(
      sessionId,
      dbName,
      docNum as string,
    );
    if (!data) {
      return res.status(404).json({ message: "Outgoing Payment not found", success: false });
    }
    res.status(200).json({ data, success: true });
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

    const result = await outgoingPaymentService.createPayment(sessionId, validatedPayload);

    res.status(201).json({ data: result, message: result.message, success: true });
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

    const result = await outgoingPaymentService.updatePayment(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ message: result.message, success: true });
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

    const result = await outgoingPaymentService.cancelPayment(sessionId, id as string);
    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Fetches DSC1 accounts for the account selection dropdown in outgoing payment forms.
export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    AccountQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const result = await outgoingPaymentService.getAccounts(dbName, { search, limit });
    res.status(200).json({ data: result.data, success: true, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const outgoingPaymentController = {
  cancelPayment,
  createPayment,
  getAccounts,
  getPayment,
  getPaymentByDocNum,
  getPaymentDocNums,
  getPayments,
  updatePayment,
};
