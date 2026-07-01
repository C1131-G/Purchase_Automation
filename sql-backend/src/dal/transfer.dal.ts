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
    res.status(200).json({
      data: r.data,
      total: r.total,
      page: r.page,
      limit: r.limit,
      totalPages: r.totalPages,
      success: true,
    });
  } catch (e) {
    next(e);
  }
};

export const getTransfer: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferService.getByDocNum(Number(req.params.id));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await inventoryTransferService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data, success: true });
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

export const transferDal = { create, getDocNums, getList, getTransfer };
