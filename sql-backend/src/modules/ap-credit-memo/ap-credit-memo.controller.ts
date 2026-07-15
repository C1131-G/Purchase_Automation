import type { RequestHandler } from "express";

import { toPascalCase, toPascalCaseDocnums, toPascalCaseList } from "@/core/utils/sap-format.util";

import { apCreditMemoService } from "./ap-credit-memo.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const result = await apCreditMemoService.getList(req.query);
    const transformed = result.data
      ? toPascalCaseList(result as never)
      : { data: [], limit: 20, page: 1, total: 0, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await apCreditMemoService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data: toPascalCaseDocnums(data), success: true });
  } catch (error) {
    return next(error);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const draftDocEntry = req.query.draftDocEntry ? Number(req.query.draftDocEntry) : undefined;
    const result = await apCreditMemoService.getByDocNum(Number(req.params.id), draftDocEntry);
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await apCreditMemoService.create(req.body);
    res.status(201).json({
      data: toPascalCase(result),
      message: "AP Credit memo created",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await apCreditMemoService.update(Number(req.params.id), req.body);
    res.status(200).json({
      data: toPascalCase(result),
      message: "AP Credit memo updated",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await apCreditMemoService.cancel(Number(req.params.id));
    res.status(200).json({
      data: toPascalCase(result),
      message: "AP Credit memo cancelled",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const apCreditMemoController = {
  cancel,
  create,
  getById,
  getDocNums,
  getList,
  update,
};
