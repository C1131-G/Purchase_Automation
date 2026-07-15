import type { RequestHandler } from "express";

import { toPascalCase, toPascalCaseDocnums, toPascalCaseList } from "@/core/utils/sap-format.util";

import { arInvoiceService } from "./ar-invoice.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const r = await arInvoiceService.getList(req.query);
    const transformed = r.data
      ? toPascalCaseList(r as never)
      : { data: [], limit: 20, page: 1, total: 0, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await arInvoiceService.getDocNums(
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
    const result = await arInvoiceService.getByDocNum(Number(req.params.id), draftDocEntry);
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await arInvoiceService.create(req.body);
    res.status(201).json({
      data: toPascalCase(result),
      message: "AR Invoice created",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await arInvoiceService.update(Number(req.params.id), req.body);
    res.status(200).json({
      data: toPascalCase(result),
      message: "AR Invoice updated",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await arInvoiceService.cancel(Number(req.params.id));
    res.status(200).json({
      data: toPascalCase(result),
      message: "AR Invoice cancelled",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const reopen: RequestHandler = async (req, res, next) => {
  try {
    const result = await arInvoiceService.reopen(Number(req.params.id));
    res.status(200).json({
      data: toPascalCase(result),
      message: "AR Invoice reopened",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const arInvoiceController = {
  cancel,
  create,
  getById,
  getDocNums,
  getList,
  reopen,
  update,
};
