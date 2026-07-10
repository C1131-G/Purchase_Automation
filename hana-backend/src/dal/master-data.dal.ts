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
      typeof req.query.limit === "number"
        ? req.query.limit
        : typeof req.query.limit === "string" && req.query.limit.trim() !== ""
          ? Number(req.query.limit)
          : undefined;
    const type = req.query.type as "sales" | "purchase" | undefined;
    const priceList =
      typeof req.query.priceList === "number"
        ? req.query.priceList
        : typeof req.query.priceList === "string" && req.query.priceList.trim() !== ""
          ? Number(req.query.priceList)
          : undefined;
    logger.info({
      dbName,
      limit,
      msg: "Fetching products",
      priceList,
      search,
      type,
      warehouseCode,
    });
    const data = await masterDataService.getProducts(
      dbName,
      warehouseCode,
      search,
      limit,
      type,
      priceList,
    );
    res.status(200).json({ data, success: true });
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
    logger.info({ dbName, itemCode, msg: "Fetching product warehouse stocks" });
    const data = await masterDataService.getProductWarehouseStocks(dbName, itemCode);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves all vendors registered in the specific SAP company database.
export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ dbName, msg: "Fetching vendors" });
    const data = await masterDataService.getVendors(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves all customers registered in the specific SAP company database.
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ dbName, msg: "Fetching customers" });
    const data = await masterDataService.getCustomers(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Returns a list of all active tax codes defined for the tenant.
export const getTaxCodes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ dbName, msg: "Fetching tax codes" });
    const data = await masterDataService.getTaxCodes(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Fetches standard Units of Measure (UOMs) used for inventory and transactions.
export const getUOMs = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ dbName, msg: "Fetching UOMs" });
    const data = await masterDataService.getUOMs(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves the list of warehouses configured in the tenant's SAP system.
export const getWarehouses = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ dbName, msg: "Fetching warehouses" });
    const data = await masterDataService.getWarehouses(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves the list of price lists from SAP HANA (OPLN table).
export const getPriceLists = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName, sessionId } = authReq.user;
    logger.info({ dbName, msg: "Fetching price lists via Service Layer" });
    const data = await masterDataService.getPriceLists(dbName);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getSeries = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const documentType = typeof req.query.documentType === "string" ? req.query.documentType : "59";
    logger.info({ dbName, documentType, msg: "Fetching series from NNM1" });
    const data = await masterDataService.getSeries(dbName, documentType);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseBins = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const warehouseCode = String(req.params.code);
    logger.info({ dbName, msg: "Fetching warehouse bins from OBIN", warehouseCode });
    const data = await masterDataService.getWarehouseBins(dbName, warehouseCode);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.user;
    const { serviceLayerClient } = await import("@/services/service-layer.service");
    const result = await serviceLayerClient.request<{
      value: Array<{ FactorCode: string; FactorDescription: string }>;
    }>(sessionId, "GET", "/DistributionRules?$select=FactorCode,FactorDescription");
    const data = result.value.map((r) => ({ Code: r.FactorCode, Name: r.FactorDescription }));
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getInventoryAdjustmentReasons = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    logger.info({ dbName, msg: "Fetching inventory adjustment reasons" });
    const { type } = req.query;
    const data = await masterDataService.getInventoryAdjustmentReasons(
      dbName,
      (type as "receipt" | "issue") || "receipt",
    );
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const masterDataDal = {
  getCustomers,
  getPriceLists,
  getProductWarehouseStocks,
  getProducts,
  getTaxCodes,
  getUOMs,
  getVendors,
  getWarehouses,
  getSeries,
  getWarehouseBins,
  getBranches,
  getInventoryAdjustmentReasons,
};
