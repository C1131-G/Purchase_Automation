import type { RequestHandler } from "express";
import { apInvoiceService } from "@/services/ap-invoice.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, cardCode, docStatus, dateFrom, dateTo, search } = req.query;
    const r = await apInvoiceService.getList({
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
    const data = await apInvoiceService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data, success: true });
  } catch (e) {
    next(e);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const result = await apInvoiceService.getById(Number(req.params.id));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await apInvoiceService.create(req.body);
    res.status(201).json({ data: result, message: "AP Invoice created", success: true });
  } catch (e) {
    next(e);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await apInvoiceService.update(Number(req.params.id), req.body);
    res.status(200).json({ data: result, message: "AP Invoice updated", success: true });
  } catch (e) {
    next(e);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await apInvoiceService.cancel(Number(req.params.id));
    res.status(200).json({ data: result, message: "AP Invoice cancelled", success: true });
  } catch (e) {
    next(e);
  }
};

export const reopen: RequestHandler = async (req, res, next) => {
  try {
    const result = await apInvoiceService.reopen(Number(req.params.id));
    res.status(200).json({ data: result, message: "AP Invoice reopened", success: true });
  } catch (e) {
    next(e);
  }
};

export const apInvoiceDal = { cancel, create, getById, getDocNums, getList, reopen, update };
