// Item Master DAL: Express request handlers for item-master endpoints.

import type { RequestHandler } from "express";
import { itemMasterService } from "@/services/item-master.service";
import {
  ItemMasterLookupQuerySchema,
  ItemMasterQuerySchema,
} from "@/validation/schemas/inputs/item-master.input";

export const getItems: RequestHandler = async (req, res, next) => {
  try {
    const parsed = ItemMasterQuerySchema.parse(req.query);
    const result = await itemMasterService.getItems(parsed);
    res.status(200).json({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      success: true,
    });
  } catch (e) {
    next(e);
  }
};

export const getItem: RequestHandler = async (req, res, next) => {
  try {
    const result = await itemMasterService.getItemByItemCode(String(req.params.id));
    if (!result) return res.status(404).json({ message: "Item not found", success: false });
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

const lookup =
  (
    fn: (
      search?: string,
      limit?: number,
    ) => Promise<{ code: string | null; name: string | null }[]>,
  ) =>
  async (req: any, res: any, next: any) => {
    try {
      const { search, limit } = ItemMasterLookupQuerySchema.parse(req.query);
      const data = await fn(search, limit);
      res.status(200).json({ data, success: true });
    } catch (e) {
      next(e);
    }
  };

export const getItemCodes = lookup(itemMasterService.getItemCodes);
export const getItemNames = lookup(itemMasterService.getItemNames);
export const getItemGroups = lookup(itemMasterService.getItemGroups);
export const getInvntryUoms = lookup(itemMasterService.getInvntryUoms);
export const getBarCodes = lookup(itemMasterService.getBarCodes);

export const itemMasterDal = {
  getBarCodes,
  getInvntryUoms,
  getItem,
  getItemCodes,
  getItemGroups,
  getItemNames,
  getItems,
};
