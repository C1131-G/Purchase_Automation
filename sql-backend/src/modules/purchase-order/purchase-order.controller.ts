import type { RequestHandler } from "express";

import { toPascalCase, toPascalCaseDocnums, toPascalCaseList } from "@/core/utils/sap-format.util";

import { purchaseOrderService } from "./purchase-order.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseOrderService.getList(req.query);
    const transformed = result.data
      ? toPascalCaseList(result as never)
      : { data: [], limit: 20, page: 1, total: 0, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const draftDocEntry = req.query.draftDocEntry ? Number(req.query.draftDocEntry) : undefined;
    const result = await purchaseOrderService.getByDocNum(Number(req.params.id), draftDocEntry);
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const getByDocNum: RequestHandler = async (req, res, next) => {
  try {
    const draftDocEntry = req.query.draftDocEntry ? Number(req.query.draftDocEntry) : undefined;
    const result = await purchaseOrderService.getByDocNum(Number(req.params.docNum), draftDocEntry);
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const result = await purchaseOrderService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data: toPascalCaseDocnums(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseOrderService.create(req.body);
    res.status(201).json({
      data: toPascalCase(result),
      message: "Purchase order created",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseOrderService.update(Number(req.params.id), req.body);
    res.status(200).json({
      data: toPascalCase(result),
      message: "Purchase order updated",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseOrderService.cancel(Number(req.params.id));
    res.status(200).json({
      data: toPascalCase(result),
      message: "Purchase order cancelled",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const previewNextDocNum: RequestHandler = async (req, res, next) => {
  try {
    const result = await purchaseOrderService.previewNextDocNum();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const purchaseOrderDal = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
