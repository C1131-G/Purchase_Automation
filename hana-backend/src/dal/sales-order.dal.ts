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
import type { SalesOrderDocNumLookupQuery } from "@/validation/schemas/inputs/sales-order.input";

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

    logger.info({ dbName, filters, msg: "Fetching Sales Orders" });

    const result = await salesOrderService.getSalesOrders(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched Sales Orders",
      total: result.total,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getSalesOrderDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    SalesOrderDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await salesOrderService.getSalesOrderDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
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

    logger.info({ id, msg: "Fetching Sales Order detail" });

    const data = await salesOrderService.getSalesOrder(sessionId, id as string);
    if (!data) {
      return res.status(404).json({ message: "Sales Order not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves sales order details by DocNum.
export const getSalesOrderByDocNum = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;

    logger.info({ docNum, msg: "Fetching Sales Order detail by DocNum" });

    const data = await salesOrderService.getSalesOrderByDocNum(sessionId, dbName, docNum as string);
    if (!data) {
      return res.status(404).json({ message: "Sales Order not found", success: false });
    }
    res.status(200).json({ data, success: true });
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

    logger.info({
      customer: validatedPayload.CardCode,
      msg: "Creating Sales Order",
    });

    const result = await salesOrderService.createSalesOrder(sessionId, validatedPayload);

    logger.info({ docNum: result.DocNum, msg: "Sales Order Created" });

    res.status(201).json({ data: result, message: result.message, success: true });
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

    logger.info({ id, msg: "Updating Sales Order" });

    const result = await salesOrderService.updateSalesOrder(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ message: result.message, success: true });
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
    res.status(200).json({ data, success: true });
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

    logger.info({ id, msg: "Canceling Sales Order" });

    const result = await salesOrderService.cancelSalesOrder(sessionId, id as string);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Fetches all open document lines for a specific customer to support the 'Pull from SO' feature.
export const getOpenSalesOrderLines = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { cardCode } = authReq.query as { cardCode?: string };

    if (!cardCode || typeof cardCode !== "string") {
      return res.status(400).json({
        message: "cardCode query parameter is required",
        success: false,
      });
    }

    logger.info({ cardCode, msg: "Fetching Open Sales Order lines" });

    const data = await salesOrderService.getOpenSalesOrderLines(sessionId, cardCode);

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const salesOrderDal = {
  cancelSalesOrder,
  createSalesOrder,
  getOpenSalesOrderLines,
  getSalesEmployees,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesOrderDocNums,
  getSalesOrders,
  updateSalesOrder,
};
