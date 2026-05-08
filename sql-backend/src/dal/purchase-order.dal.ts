// Purchase Order DAL: Handles purchase order data access.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { PurchaseOrderQuery } from "@/dal/types/purchase-order.types";
import { purchaseOrderService } from "@/services/purchase-order.service";

export const getPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    PurchaseOrderQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    const result = await purchaseOrderService.getPurchaseOrders(dbName, filters);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrderDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = req.query as { search?: string; limit?: string };

    const data = await purchaseOrderService.getPurchaseOrderDocNums(
      dbName,
      search,
      Number.parseInt(limit) || 10,
    );

    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = req.params;

    const data = await purchaseOrderService.getPurchaseOrder(dbName, id);

    if (!data) {
      return res.status(404).json({ message: "Purchase Order not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const purchaseOrderDal = {
  getPurchaseOrder,
  getPurchaseOrderDocNums,
  getPurchaseOrders,
};
