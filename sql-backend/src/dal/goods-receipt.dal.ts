import type { RequestHandler } from "express";
import { goodsReceiptService } from "@/services/goods-receipt.service";
export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, docStatus, dateFrom, dateTo, search } = req.query;
    const r = await goodsReceiptService.getList({
      page: typeof page === "string" ? Number(page) : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      docStatus: typeof docStatus === "string" ? docStatus : undefined,
      dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
      dateTo: typeof dateTo === "string" ? dateTo : undefined,
      search: typeof search === "string" ? search : undefined,
    });
    res.status(200).json({ data: r, success: true });
  } catch (e) {
    next(e);
  }
};
export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await goodsReceiptService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data, success: true });
  } catch (e) {
    next(e);
  }
};
export const getById: RequestHandler = async (req, res, next) => {
  try {
    const result = await goodsReceiptService.getById(Number(req.params.id));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};
export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await goodsReceiptService.create(req.body);
    res.status(201).json({ data: result, message: "Goods receipt created", success: true });
  } catch (e) {
    next(e);
  }
};
export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await goodsReceiptService.update(Number(req.params.id), req.body);
    res.status(200).json({ data: result, message: "Goods receipt updated", success: true });
  } catch (e) {
    next(e);
  }
};
export const goodsReceiptDal = { create, getById, getDocNums, getList, update };
