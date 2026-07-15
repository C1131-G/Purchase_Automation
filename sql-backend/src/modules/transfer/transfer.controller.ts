import type { RequestHandler } from "express";

import { toPascalCase, toPascalCaseDocnums, toPascalCaseList } from "@/core/utils/sap-format.util";

import { inventoryTransferService } from "./transfer.service";

export const getList: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferService.getList(req.query);
    const transformed = result.data
      ? toPascalCaseList(result as never)
      : { data: [], limit: 20, page: 1, total: 0, totalPages: 0 };
    res.status(200).json({ ...transformed, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getTransfer: RequestHandler = async (req, res, next) => {
  try {
    const result = await inventoryTransferService.getByDocNum(Number(req.params.id));
    res.status(200).json({ data: toPascalCase(result), success: true });
  } catch (error) {
    return next(error);
  }
};

export const getDocNums: RequestHandler = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const data = await inventoryTransferService.getDocNums(
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
    const result = await inventoryTransferService.create(req.body);
    res.status(201).json({
      data: toPascalCase(result),
      message: "Inventory transfer created",
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const transferController = { create, getDocNums, getList, getTransfer };
