import type { RequestHandler } from "express";
import { inventoryTransferService } from "@/services/inventory-transfer.service";
export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, docStatus, dateFrom, dateTo } = req.query;
    const r = await inventoryTransferService.getList({
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
    const result = await inventoryTransferService.create(req.body);
    res.status(201).json({ data: result, message: "Inventory transfer created", success: true });
  } catch (e) {
    next(e);
  }
};
export const inventoryTransferDal = { create, getList };
