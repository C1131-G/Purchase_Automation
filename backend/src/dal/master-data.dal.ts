// Master Data DAL: Handles requests for master data lookups (Products, Venodrs, Tax Codes, etc.).

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
// Services
import { masterDataService } from "@/services/master-data.service";

// Fetches the list of all available products (items) from the tenant database.
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const warehouseCode =
      typeof req.query.warehouseCode === "string" ? req.query.warehouseCode : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const limit =
      typeof req.query.limit === "string" && req.query.limit.trim() !== ""
        ? Number(req.query.limit)
        : undefined;
    logger.info({ msg: "Fetching products", dbName, warehouseCode, search, limit });
    const data = await masterDataService.getProducts(dbName, warehouseCode, search, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getProductWarehouseStocks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const itemCode = typeof req.query.itemCode === "string" ? req.query.itemCode : "";
    logger.info({ msg: "Fetching product warehouse stocks", dbName, itemCode });
    const data = await masterDataService.getProductWarehouseStocks(dbName, itemCode);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retrieves all vendors registered in the specific SAP company database.
export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ msg: "Fetching vendors", dbName });
    const data = await masterDataService.getVendors(dbName);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retrieves all customers registered in the specific SAP company database.
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ msg: "Fetching customers", dbName });
    const data = await masterDataService.getCustomers(dbName);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Returns a list of all active tax codes defined for the tenant.
export const getTaxCodes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ msg: "Fetching tax codes", dbName });
    const data = await masterDataService.getTaxCodes(dbName);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Fetches standard Units of Measure (UOMs) used for inventory and transactions.
export const getUOMs = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ msg: "Fetching UOMs", dbName });
    const data = await masterDataService.getUOMs(dbName);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retrieves the list of warehouses configured in the tenant's SAP system.
export const getWarehouses = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ msg: "Fetching warehouses", dbName });
    const data = await masterDataService.getWarehouses(dbName);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const masterDataDal = {
  getProducts,
  getProductWarehouseStocks,
  getVendors,
  getCustomers,
  getTaxCodes,
  getUOMs,
  getWarehouses,
};
