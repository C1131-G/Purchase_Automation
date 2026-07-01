// Purchase Order DAL: Express request handlers for purchase order CRUD.

import type { RequestHandler } from "express";

import { purchaseOrderService } from "@/services/purchase-order.service";
import { CreatePurchaseOrderSchema } from "@/validation/schemas/inputs/purchase-orders.input";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, cardCode, docStatus, dateFrom, dateTo, search } = req.query;
    const result = await purchaseOrderService.getList({
      page: typeof page === "string" ? Number(page) : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      cardCode: typeof cardCode === "string" ? cardCode : undefined,
      docStatus: typeof docStatus === "string" ? docStatus : undefined,
      dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
      dateTo: typeof dateTo === "string" ? dateTo : undefined,
      search: typeof search === "string" ? search : undefined,
    });
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await purchaseOrderService.getById(id);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getByDocNum: RequestHandler = async (req, res, next) => {
  try {
    const docNum = Number(req.params.docNum);
    const result = await purchaseOrderService.getByDocNum(docNum);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const result = await purchaseOrderService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const validated = CreatePurchaseOrderSchema.parse(req.body);
    const result = await purchaseOrderService.create(validated as any);
    res.status(201).json({ data: result, message: "Purchase order created", success: true });
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await purchaseOrderService.update(id, req.body);
    res.status(200).json({ data: result, message: "Purchase order updated", success: true });
  } catch (error) {
    next(error);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await purchaseOrderService.cancel(id);
    res.status(200).json({ data: result, message: "Purchase order cancelled", success: true });
  } catch (error) {
    next(error);
  }
};

export const purchaseOrderDal = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
