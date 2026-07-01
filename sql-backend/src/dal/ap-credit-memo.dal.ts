import type { RequestHandler } from "express";
import { apCreditMemoService } from "@/services/ap-credit-memo.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const { page, limit, cardCode, docStatus, dateFrom, dateTo, search } = req.query;
    const r = await apCreditMemoService.getList({
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
    const data = await apCreditMemoService.getDocNums(
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
    const result = await apCreditMemoService.getById(Number(req.params.id));
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await apCreditMemoService.create(req.body);
    res.status(201).json({ data: result, message: "AP Credit memo created", success: true });
  } catch (e) {
    next(e);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const result = await apCreditMemoService.update(Number(req.params.id), req.body);
    res.status(200).json({ data: result, message: "AP Credit memo updated", success: true });
  } catch (e) {
    next(e);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const result = await apCreditMemoService.cancel(Number(req.params.id));
    res.status(200).json({ data: result, message: "AP Credit memo cancelled", success: true });
  } catch (e) {
    next(e);
  }
};

export const apCreditMemoDal = { cancel, create, getById, getDocNums, getList, update };
