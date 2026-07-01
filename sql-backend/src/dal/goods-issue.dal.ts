import type { RequestHandler } from "express";
import { goodsIssueService } from "@/services/goods-issue.service";
export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, docStatus, dateFrom, dateTo } = req.query;
    const r = await goodsIssueService.getList({
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
export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await goodsIssueService.getDocNums(
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
    const result = await goodsIssueService.getById(Number(req.params.id));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};
export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await goodsIssueService.create(req.body);
    res.status(201).json({ data: result, message: "Goods issue created", success: true });
  } catch (e) {
    next(e);
  }
};
export const goodsIssueDal = { create, getById, getDocNums, getList };
