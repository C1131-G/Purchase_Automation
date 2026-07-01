import type { RequestHandler } from "express";
import { inventoryTransferRequestService } from "@/services/inventory-transfer-request.service";
export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, docStatus, dateFrom, dateTo } = req.query;
    const r = await inventoryTransferRequestService.getList({
      page: typeof page === "string" ? Number(page) : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      docStatus: typeof docStatus === "string" ? docStatus : undefined,
      dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
      dateTo: typeof dateTo === "string" ? dateTo : undefined,
    });
    res.status(200).json({ data: r, success: true });
  } catch (e) {
    next(e);
  }
};
export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferRequestService.create(req.body);
    res.status(201).json({ data: result, message: "Transfer request created", success: true });
  } catch (e) {
    next(e);
  }
};
export const inventoryTransferRequestDal = { create, getList };
