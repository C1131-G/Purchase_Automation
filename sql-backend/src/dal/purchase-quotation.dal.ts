import type { RequestHandler } from "express";
import { purchaseQuotationService } from "@/services/purchase-quotation.service";
import {
  toPascalCase,
  toPascalCaseDocnums,
  toPascalCaseList,
} from "@/core/utils/response-transformer";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseQuotationService.getList(req.query);
    const transformed = result.data
      ? toPascalCaseList(result as any)
      : { data: [] as any[], total: 0, page: 1, limit: 20, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
  } catch (e) {
    next(e);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await purchaseQuotationService.getDocNums(
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
    const result = await purchaseQuotationService.getByDocNum(
      Number(req.params.docNum),
      draftDocEntry,
    );
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (e) {
    next(e);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const draftDocEntry = req.query.draftDocEntry ? Number(req.query.draftDocEntry) : undefined;
    const result = await purchaseQuotationService.getByDocNum(Number(req.params.id), draftDocEntry);
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (e) {
    next(e);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseQuotationService.create(req.body);
    res
      .status(201)
      .json({ data: toPascalCase(result), message: "Purchase quotation created", success: true });
  } catch (e) {
    next(e);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseQuotationService.update(Number(req.params.id), req.body);
    res
      .status(200)
      .json({ data: toPascalCase(result), message: "Purchase quotation updated", success: true });
  } catch (e) {
    next(e);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseQuotationService.cancel(Number(req.params.id));
    res
      .status(200)
      .json({ data: toPascalCase(result), message: "Purchase quotation cancelled", success: true });
  } catch (e) {
    next(e);
  }
};

export const purchaseQuotationDal = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
