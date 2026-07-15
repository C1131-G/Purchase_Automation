import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "@/types/express.types";
import { itemMasterService } from "./item-master.service";
import type { ItemMasterQuery, ItemMasterLookupQuery } from "./item-master.schema";

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    ItemMasterQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    const itemsResult = await itemMasterService.getItems(dbName, filters);

    res.status(200).json({ success: true, ...itemsResult });
  } catch (error) {
    next(error);
  }
};

export const getItem = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    const itemByItemCodeDetail = await itemMasterService.getItemByItemCode(dbName, id as string);

    if (!itemByItemCodeDetail) {
      return res.status(404).json({ message: "Item not found", success: false });
    }

    res.status(200).json({ data: itemByItemCodeDetail, success: true });
  } catch (error) {
    next(error);
  }
};

export const getItemCodes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    ItemMasterLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const itemCodesResult = await itemMasterService.getItemCodes(dbName, search, limit);

    res.status(200).json({
      itemCodesResult,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getItemNames = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    ItemMasterLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const itemNamesResult = await itemMasterService.getItemNames(dbName, search, limit);

    res.status(200).json({
      itemNamesResult,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getItemGroups = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    ItemMasterLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const itemGroupsResult = await itemMasterService.getItemGroups(dbName, search, limit);

    res.status(200).json({
      itemGroupsResult,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvntryUoms = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    ItemMasterLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const invntryUomsResult = await itemMasterService.getInvntryUoms(dbName, search, limit);

    res.status(200).json({
      invntryUomsResult,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getBarCodes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    ItemMasterLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;

    const barCodesResult = await itemMasterService.getBarCodes(dbName, search, limit);

    res.status(200).json({
      barCodesResult,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const itemMasterController = {
  getItems,
  getItem,
  getItemCodes,
  getItemNames,
  getItemGroups,
  getInvntryUoms,
  getBarCodes,
};
