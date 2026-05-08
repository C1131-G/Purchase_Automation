// Incoming Payment DAL: Manages HTTP requests for Incoming Payment operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PaymentQuery } from "@/dal/types/incoming-payment.types";
import { incomingPaymentService } from "@/services/incoming-payment.service";
import { CreatePaymentInputSchema } from "@/validation/schemas/inputs/payment.input";
import type { PaymentDocNumLookupQuery } from "@/validation/schemas/inputs/payment.input";

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PaymentQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching Incoming Payments" });

    const result = await incomingPaymentService.getPayments(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched Incoming Payments",
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
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Incoming Payment detail" });

    const data = await incomingPaymentService.getPayment(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Incoming Payment not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getPaymentByDocNum = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;

    logger.info({ dbName, docNum, msg: "Fetching Incoming Payment by DocNum" });

    const data = await incomingPaymentService.getPaymentByDocNum(dbName, docNum as string);

    if (!data) {
      return res.status(404).json({ message: "Incoming Payment not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  const _authReq = req as unknown as AuthenticatedRequest;
  try {
    const payload = req.body;
    CreatePaymentInputSchema.parse(payload);

    logger.info({
      cardCode: (payload as Record<string, unknown>).CardCode,
      msg: "Creating Incoming Payment",
    });

    res.status(201).json({
      data: payload,
      message: "Payment created (stub)",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const incomingPaymentDal = {
  createPayment,
  getPayment,
  getPaymentByDocNum,
  getPaymentDocNums,
  getPayments,
};
