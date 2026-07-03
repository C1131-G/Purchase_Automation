import type { RequestHandler } from "express";
import { incomingPaymentService } from "@/services/incoming-payment.service";
import {
  toPascalCase,
  toPascalCaseDocnums,
  toPascalCaseList,
} from "@/core/utils/response-transformer";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, cardCode, dateFrom, dateTo, search } = req.query;
    const r = await incomingPaymentService.getList({
      page: typeof page === "string" ? Number(page) : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      cardCode: typeof cardCode === "string" ? cardCode : undefined,
      dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
      dateTo: typeof dateTo === "string" ? dateTo : undefined,
      search: typeof search === "string" ? search : undefined,
    });
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
    const data = await incomingPaymentService.getDocNums(
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
    const result = await incomingPaymentService.getById(Number(req.params.id));
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (e) {
    next(e);
  }
};
export const getByDocNum: RequestHandler = async (req, res, next) => {
  try {
    const result = await incomingPaymentService.getByDocNum(Number(req.params.docNum));
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (e) {
    next(e);
  }
};
export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await incomingPaymentService.create(req.body);
    res
      .status(201)
      .json({ data: toPascalCase(result), message: "Incoming payment created", success: true });
  } catch (e) {
    next(e);
  }
};
export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await incomingPaymentService.update(Number(req.params.id), req.body);
    res
      .status(200)
      .json({ data: toPascalCase(result), message: "Incoming payment updated", success: true });
  } catch (e) {
    next(e);
  }
};
export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await incomingPaymentService.cancel(Number(req.params.id));
    res
      .status(200)
      .json({ data: toPascalCase(result), message: "Incoming payment cancelled", success: true });
  } catch (e) {
    next(e);
  }
};
export const incomingPaymentDal = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
