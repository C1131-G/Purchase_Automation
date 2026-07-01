import type { RequestHandler } from "express";
import { salesQuotationService } from "@/services/sales-quotation.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, cardCode, docStatus, dateFrom, dateTo, search } = req.query;
    const r = await salesQuotationService.getList({
      page: typeof page === "string" ? Number(page) : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      cardCode: typeof cardCode === "string" ? cardCode : undefined,
      docStatus: typeof docStatus === "string" ? docStatus : undefined,
      dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
      dateTo: typeof dateTo === "string" ? dateTo : undefined,
      search: typeof search === "string" ? search : undefined,
    });
    res.status(200).json({ data: r, success: true });
  } catch (e) {
    next(e);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await salesQuotationService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data, success: true });
  } catch (e) {
    next(e);
  }
};

export const getByDocNum: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesQuotationService.getByDocNum(Number(req.params.docNum));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesQuotationService.getById(Number(req.params.id));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesQuotationService.create(req.body);
    res.status(201).json({ data: result, message: "Sales quotation created", success: true });
  } catch (e) {
    next(e);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesQuotationService.update(Number(req.params.id), req.body);
    res.status(200).json({ data: result, message: "Sales quotation updated", success: true });
  } catch (e) {
    next(e);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await salesQuotationService.cancel(Number(req.params.id));
    res.status(200).json({ data: result, message: "Sales quotation cancelled", success: true });
  } catch (e) {
    next(e);
  }
};

export const salesQuotationDal = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
