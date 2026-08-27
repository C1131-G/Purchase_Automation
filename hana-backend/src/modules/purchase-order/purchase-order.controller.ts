// Purchase Order Controller: Handles HTTP requests for Purchase Order (PO) operations.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/types/express.types";
import { requirePortalCreatedBy } from "@/modules/auth/portal-created-by";
import type { PurchaseOrderQuery } from "./purchase-order.types";
import { purchaseOrderService } from "./purchase-order.service";
import {
  CreatePurchaseOrderInputSchema,
  UpdatePurchaseOrderInputSchema,
} from "./purchase-order.schema";
import type { PurchaseOrderDocNumLookupQuery } from "./purchase-order.schema";
import { assertIcPartnerAllowed } from "@/modules/intercompany";

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

    const result = await purchaseOrderService.getPurchaseOrders(dbName, filters);

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
      data,
      success: true,
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

    const data = await purchaseOrderService.getPurchaseOrder(sessionId, id as string);

    if (!data) {
      return res.status(404).json({
        message: "Purchase Order not found",
        success: false,
      });
    }
    await assertIcPartnerAllowed(authReq.user.dbName, "purchase", String(data.CardCode ?? ""));

    res.status(200).json({
      data,
      success: true,
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
    const draftDocEntry = req.query.draftDocEntry as string | undefined;

    const data = await purchaseOrderService.getPurchaseOrderByDocNum(
      sessionId,
      dbName,
      docNum as string,
      draftDocEntry,
    );
    await assertIcPartnerAllowed(dbName, "purchase", String(data?.CardCode ?? ""));

    res.status(200).json({
      data,
      success: true,
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

    const result = await purchaseOrderService.createPurchaseOrder(
      sessionId,
      validatedPayload,
      undefined,
      requirePortalCreatedBy(authReq.session),
    );

    res.status(201).json({
      data: result,
      message: result.message,
      success: true,
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

    const detail = await purchaseOrderService.getPurchaseOrder(sessionId, id as string);
    if (!detail) {
      return res.status(404).json({ message: "Purchase Order not found", success: false });
    }
    await assertIcPartnerAllowed(authReq.user.dbName, "purchase", String(detail.CardCode ?? ""));

    const result = await purchaseOrderService.updatePurchaseOrder(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({
      message: result.message,
      success: true,
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

    const result = await purchaseOrderService.cancelPurchaseOrder(sessionId, id as string);

    res.status(200).json({
      message: result.message,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseOrderController = {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
  getPurchaseOrderDocNums,
  getPurchaseOrders,
  updatePurchaseOrder,
};
