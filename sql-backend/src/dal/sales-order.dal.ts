import type { RequestHandler } from "express";
import { salesOrderService } from "@/services/sales-order.service";
import {
  toPascalCase,
  toPascalCaseDocnums,
  toPascalCaseList,
} from "@/core/utils/response-transformer";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesOrderService.getList(req.query);
    const transformed = result.data
      ? toPascalCaseList(result as any)
      : { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
  } catch (e) {
    next(e);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await salesOrderService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data: toPascalCaseDocnums(data), success: true });
  } catch (e) {
    next(e);
  }
};

export const getByDocNum: RequestHandler = async (req, res, next) => {
  try {
    const draftDocEntry = req.query.draftDocEntry ? Number(req.query.draftDocEntry) : undefined;
    const result = await salesOrderService.getByDocNum(Number(req.params.docNum), draftDocEntry);
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (e) {
    next(e);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const draftDocEntry = req.query.draftDocEntry ? Number(req.query.draftDocEntry) : undefined;
    const result = await salesOrderService.getByDocNum(Number(req.params.id), draftDocEntry);
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (e) {
    next(e);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesOrderService.create(req.body);
    res
      .status(201)
      .json({ data: toPascalCase(result), message: "Sales order created", success: true });
  } catch (e) {
    next(e);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesOrderService.update(Number(req.params.id), req.body);
    res
      .status(200)
      .json({ data: toPascalCase(result), message: "Sales order updated", success: true });
  } catch (e) {
    next(e);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesOrderService.cancel(Number(req.params.id));
    res
      .status(200)
      .json({ data: toPascalCase(result), message: "Sales order cancelled", success: true });
  } catch (e) {
    next(e);
  }
};

export const salesOrderDal = { cancel, create, getByDocNum, getById, getDocNums, getList, update };
