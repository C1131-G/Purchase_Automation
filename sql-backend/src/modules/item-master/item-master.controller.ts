import type { RequestHandler } from "express";

import { ItemMasterLookupQuerySchema, ItemMasterQuerySchema } from "./item-master.schema";
import { itemMasterService } from "./item-master.service";

export const getItems: RequestHandler = async (req, res, next) => {
  try {
    const parsed = ItemMasterQuerySchema.parse(req.query);
    const result = await itemMasterService.getItems(parsed);
    res.status(200).json({
      data: result.data,
      limit: result.limit,
      page: result.page,
      success: true,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return next(error);
  }
};

export const getItem: RequestHandler = async (req, res, next) => {
  try {
    const result = await itemMasterService.getItemByItemCode(String(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Item not found", success: false });
    }
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

const lookup =
  (
    run: (
      search?: string,
      limit?: number,
    ) => Promise<{ code: string | null; name: string | null }[]>,
  ) =>
  async (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    try {
      const { search, limit } = ItemMasterLookupQuerySchema.parse(req.query);
      const data = await run(search, limit);
      res.status(200).json({ data, success: true });
    } catch (error) {
      return next(error);
    }
  };

export const getItemCodes = lookup(itemMasterService.getItemCodes);
export const getItemNames = lookup(itemMasterService.getItemNames);
export const getItemGroups = lookup(itemMasterService.getItemGroups);
export const getInvntryUoms = lookup(itemMasterService.getInvntryUoms);
export const getBarCodes = lookup(itemMasterService.getBarCodes);

export const itemMasterController = {
  getBarCodes,
  getInvntryUoms,
  getItem,
  getItemCodes,
  getItemGroups,
  getItemNames,
  getItems,
};
