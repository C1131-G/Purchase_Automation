// Purchase Order DAL: Handles HTTP requests for Purchase Order (PO) operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PurchaseOrderQuery } from "@/dal/types/purchase-order.types";
import { purchaseOrderService } from "@/services/purchase-order.service";
import {
  CreatePurchaseOrderInputSchema,
  type PurchaseOrderDocNumLookupQuery,
  UpdatePurchaseOrderInputSchema,
} from "@/validation/schemas/inputs/purchase-order.input";

// Retrieves all Purchase Orders matching the specified filters (status, cancelled flag).
export const getPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PurchaseOrderQuery
  >;
  try {
    const { dbName } = authReq.user;
    // Query is already validated/sanitized by validateQuery(PurchaseOrderQuerySchema) middleware.
    const filters = authReq.query;

    logger.info({ msg: "Fetching POs", dbName, filters });

    const result = await purchaseOrderService.getPurchaseOrders(dbName, filters);

    logger.info({ msg: "Fetched POs", count: result.data.length, total: result.total });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Retrieves distinct DocNum values for lookup popup suggestions.
export const getPurchaseOrderDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PurchaseOrderDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const data = await purchaseOrderService.getPurchaseOrderDocNums(dbName, search, limit);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Gets the detailed view of a single Purchase Order by its ID.
export const getPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching PO detail", id });

    const data = await purchaseOrderService.getPurchaseOrder(sessionId, id as string);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Gets purchase order details by DocNum (table-facing identifier).
export const getPurchaseOrderByDocNum = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;

    logger.info({ msg: "Fetching PO detail by DocNum", docNum });

    const data = await purchaseOrderService.getPurchaseOrderByDocNum(
      sessionId,
      dbName,
      docNum as string,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Submits a new Purchase Order to SAP.
export const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Validate the deep object structure against the SAP-compliant Zod schema.
    const validatedPayload = CreatePurchaseOrderInputSchema.parse(payload);

    logger.info({ msg: "Creating PO", vendor: validatedPayload.CardCode });

    const result = await purchaseOrderService.createPurchaseOrder(sessionId, validatedPayload);

    logger.info({ msg: "PO Created", docNum: result.DocNum });

    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Updates an existing Purchase Order's non-transactional fields (e.g., Comments).
export const updatePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Zod validation filters out any fields that SAP doesn't allow in a PATCH request.
    const validatedPayload = UpdatePurchaseOrderInputSchema.parse(payload);

    logger.info({ msg: "Updating Purchase Order", id });

    const result = await purchaseOrderService.updatePurchaseOrder(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// Performs a cancellation operation on the Purchase Order in the SAP Service Layer.
export const cancelPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Cancelling PO", id });

    const result = await purchaseOrderService.cancelPurchaseOrder(sessionId, id as string);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseOrderDal = {
  getPurchaseOrders,
  getPurchaseOrderDocNums,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
  createPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
};
