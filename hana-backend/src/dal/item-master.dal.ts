import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { itemMasterService } from "@/services/item-master.service";
import type {
  ItemMasterQuery,
  ItemMasterLookupQuery,
} from "@/validation/schemas/inputs/item-master.input";

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

    logger.info({ dbName, filters, msg: "Fetching Items" });

    const result = await itemMasterService.getItems(dbName, filters);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getItem = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching Item detail" });

    const data = await itemMasterService.getItemByItemCode(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "Item not found", success: false });
    }

    res.status(200).json({ data, success: true });
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

    const data = await itemMasterService.getItemCodes(dbName, search, limit);

    res.status(200).json({
      data,
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

    const data = await itemMasterService.getItemNames(dbName, search, limit);

    res.status(200).json({
      data,
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

    const data = await itemMasterService.getItemGroups(dbName, search, limit);

    res.status(200).json({
      data,
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

    const data = await itemMasterService.getInvntryUoms(dbName, search, limit);

    res.status(200).json({
      data,
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

    const data = await itemMasterService.getBarCodes(dbName, search, limit);

    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const itemMasterDal = {
  getItems,
  getItem,
  getItemCodes,
  getItemNames,
  getItemGroups,
  getInvntryUoms,
  getBarCodes,
};
