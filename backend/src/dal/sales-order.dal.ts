// Sales Order DAL: Handles HTTP requests for Sales Order operations.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { SalesOrderQuery } from "@/dal/types/sales-order.types";
// Services
import { salesOrderService } from "@/services/sales-order.service";
// Validation
import {
  CreateSalesOrderInputSchema,
  UpdateSalesOrderInputSchema,
} from "@/validation/schemas/inputs/sales-order.input";

// Fetches a list of sales orders based on filters like customer name, sales order number, and date range.
export const getSalesOrders = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    SalesOrderQuery
  >;
  try {
    const { dbName } = authReq.user;
    // Query is already validated/sanitized by validateQuery(SalesOrderQuerySchema) middleware.
    const filters = authReq.query;

    logger.info({ msg: "Fetching Sales Orders", dbName, filters });

    const result = await salesOrderService.getSalesOrders(dbName, filters);

    logger.info({ msg: "Fetched Sales Orders", count: result.data.length, total: result.total });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Retrieves the details of a single sales order from the SAP Service Layer.
export const getSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching Sales Order detail", id });

    const data = await salesOrderService.getSalesOrder(sessionId, id as string);
    if (!data) return res.status(404).json({ success: false, message: "Sales Order not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Submits a new Sales Order to SAP B1.
export const createSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Validate the incoming sales order payload against the Zod schema for SAP compatibility.
    const validatedPayload = CreateSalesOrderInputSchema.parse(payload);

    logger.info({ msg: "Creating Sales Order", customer: validatedPayload.CardCode });

    const result = await salesOrderService.createSalesOrder(sessionId, validatedPayload);

    logger.info({ msg: "Sales Order Created", docNum: result.DocNum });

    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

// Updates metadata (e.g., comments) for an existing sales order via SAP Service Layer PATCH.
export const updateSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Filter and validate the update payload to ensure only permissible fields are sent to SAP.
    const validatedPayload = UpdateSalesOrderInputSchema.parse(payload);

    logger.info({ msg: "Updating Sales Order", id });

    const result = await salesOrderService.updateSalesOrder(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

// Fetches a list of all sales employees available in the tenant database.
export const getSalesEmployees = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const data = await salesOrderService.getSalesEmployees(dbName);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Flags a sales order as cancelled within SAP B1.
export const cancelSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Canceling Sales Order", id });

    const result = await salesOrderService.cancelSalesOrder(sessionId, id as string);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const salesOrderDal = {
  getSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  cancelSalesOrder,
  getSalesEmployees,
};
