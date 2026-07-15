import type { RequestHandler } from "express";

import { toPascalCase, toPascalCaseDocnums, toPascalCaseList } from "@/core/utils/sap-format.util";

import { outgoingPaymentService } from "./outgoing-payment.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const result = await outgoingPaymentService.getList(req.query);
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
    const data = await outgoingPaymentService.getDocNums(
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
    const result = await outgoingPaymentService.getByDocNum(Number(req.params.id));
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const getByDocNum: RequestHandler = async (req, res, next) => {
  try {
    const result = await outgoingPaymentService.getByDocNum(Number(req.params.docNum));
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await outgoingPaymentService.create(req.body);
    res.status(201).json({
      data: toPascalCase(result),
      message: "Outgoing payment created",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await outgoingPaymentService.update(Number(req.params.id), req.body);
    res.status(200).json({
      data: toPascalCase(result),
      message: "Outgoing payment updated",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await outgoingPaymentService.cancel(Number(req.params.id));
    res.status(200).json({
      data: toPascalCase(result),
      message: "Outgoing payment cancelled",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const outgoingPaymentController = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
