import type { RequestHandler } from "express";
import { goodsIssueService } from "@/services/goods-issue.service";
import {
  toPascalCase,
  toPascalCaseDocnums,
  toPascalCaseList,
} from "@/core/utils/response-transformer";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const r = await goodsIssueService.getList(req.query);
    const transformed = r.data
      ? toPascalCaseList(r as any)
      : { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
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
    res.status(200).json({ data: toPascalCaseDocnums(data), success: true });
  } catch (e) {
    next(e);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const result = await goodsIssueService.getByDocNum(Number(req.params.id));
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (e) {
    next(e);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await goodsIssueService.create(req.body);
    res
      .status(201)
      .json({ data: toPascalCase(result), message: "Goods issue created", success: true });
  } catch (e) {
    next(e);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await goodsIssueService.update(Number(req.params.id), req.body);
    res
      .status(200)
      .json({ data: toPascalCase(result), message: "Goods issue updated", success: true });
  } catch (e) {
    next(e);
  }
};

export const goodsIssueDal = { create, getById, getDocNums, getList, update };
