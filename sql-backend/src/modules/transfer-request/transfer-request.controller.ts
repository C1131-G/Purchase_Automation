import type { RequestHandler } from "express";

import { toPascalCase, toPascalCaseDocnums, toPascalCaseList } from "@/core/utils/sap-format.util";

import { inventoryTransferRequestService } from "./transfer-request.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferRequestService.getList(req.query);
    const transformed = result.data
      ? toPascalCaseList(result as never)
      : { data: [], limit: 20, page: 1, total: 0, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getTransferRequest: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferRequestService.getByDocNum(Number(req.params.id));
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await inventoryTransferRequestService.getDocNums(
      typeof search === "string" ? search : undefined,
      typeof limit === "string" ? Number(limit) : undefined,
    );
    res.status(200).json({ data: toPascalCaseDocnums(data), success: true });
  } catch (error) {
    return next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferRequestService.create(req.body);
    res.status(201).json({
      data: toPascalCase(result),
      message: "Transfer request created",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const transferRequestController = {
  create,
  getDocNums,
  getList,
  getTransferRequest,
};
