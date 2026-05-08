// Sales Order DAL: Manages HTTP requests for Sales Order operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { SalesOrderQuery } from "@/dal/types/sales-order.types";
import { salesOrderService } from "@/services/sales-order.service";
import { CreateSalesOrderInputSchema } from "@/validation/schemas/inputs/sales-order.input";
import type { SalesOrderDocNumLookupQuery } from "@/validation/schemas/inputs/sales-order.input";

export const getSalesOrders = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    SalesOrderQuery
  >;
  try {
    const { dbName } = authReq.user;
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

export const getSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Sales Order detail" });

    const data = await salesOrderService.getSalesOrder(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Sales Order not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getSalesOrderByDocNum = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { docNum } = authReq.params;

    logger.info({ dbName, docNum, msg: "Fetching Sales Order by DocNum" });

    const data = await salesOrderService.getSalesOrderByDocNum(dbName, docNum as string);

    if (!data) {
      return res.status(404).json({ message: "Sales Order not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getSalesEmployees = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;

    logger.info({ dbName, msg: "Fetching Sales Employees" });

    const data = await salesOrderService.getSalesEmployees(dbName);

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getOpenSalesOrderLines = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;

    logger.info({ dbName, msg: "Fetching Open Sales Order Lines" });

    const result = await salesOrderService.getOpenSalesOrderLines(dbName);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const createSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
  const _authReq = req as unknown as AuthenticatedRequest;
  try {
    const payload = req.body;
    CreateSalesOrderInputSchema.parse(payload);

    logger.info({
      customer: (payload as Record<string, unknown>).CardCode,
      msg: "Creating Sales Order",
    });

    res.status(201).json({
      data: payload,
      message: "Sales Order created (stub)",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const salesOrderDal = {
  createSalesOrder,
  getOpenSalesOrderLines,
  getSalesEmployees,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesOrderDocNums,
  getSalesOrders,
};
