// Outgoing Payment DAL: Handles HTTP requests for Outgoing Payment (Vendor Payment) operations.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PaymentQuery } from "@/dal/types/outgoing-payment.types";
import type { AccountQuery } from "@/dal/types/outgoing-payment-account.types";
// Services
import { outgoingPaymentService } from "@/services/outgoing-payment.service";
// Validation
import {
  CreatePaymentInputSchema,
  UpdatePaymentInputSchema,
} from "@/validation/schemas/inputs/payments.input";
import type { PaymentDocNumLookupQuery } from "@/validation/schemas/inputs/payments.input";

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

    logger.info({ dbName, filters, msg: "Fetching Outgoing Payments" });

    const result = await outgoingPaymentService.getPayments(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched Outgoing Payments",
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

    logger.info({ id, msg: "Fetching Outgoing Payment detail" });

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
  const start = Date.now();
  console.log(`[TIMING] Backend /by-doc-num/:docNum START for DocNum: ${req.params.docNum} at ${start}`);
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;

    logger.info({ docNum, msg: "Fetching Outgoing Payment detail by DocNum" });

    const data = await outgoingPaymentService.getPaymentByDocNum(
      sessionId,
      dbName,
      docNum as string,
    );
    const end = Date.now();
    console.log(
      `[TIMING] Backend /by-doc-num/:docNum FINISH for DocNum: ${docNum} at ${end} (took ${end - start}ms)`,
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

    logger.info({
      msg: "Creating Outgoing Payment",
      vendor: validatedPayload.CardCode,
    });

    const result = await outgoingPaymentService.createPayment(sessionId, validatedPayload);

    logger.info({ id: result.id, msg: "Outgoing Payment Created" });

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

    logger.info({ id, msg: "Updating Outgoing Payment" });

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

    logger.info({ id, msg: "Cancelling Outgoing Payment" });

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
    logger.info({ dbName, search, limit, msg: "Fetching DSC1 accounts" });
    const result = await outgoingPaymentService.getAccounts(dbName, { search, limit });
    res.status(200).json({ data: result.data, success: true, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const outgoingPaymentDal = {
  cancelPayment,
  createPayment,
  getAccounts,
  getPayment,
  getPaymentByDocNum,
  getPaymentDocNums,
  getPayments,
  updatePayment,
};
