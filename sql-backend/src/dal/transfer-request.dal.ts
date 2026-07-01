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

export const getTransferRequest: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferRequestService.getByDocNum(Number(req.params.id));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await inventoryTransferRequestService.getDocNums(
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
    const result = await inventoryTransferRequestService.create(req.body);
    res.status(201).json({ data: result, message: "Transfer request created", success: true });
  } catch (e) {
    next(e);
  }
};

export const transferRequestDal = { create, getDocNums, getList, getTransferRequest };
