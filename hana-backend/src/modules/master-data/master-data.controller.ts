// Master Data Controller: Handles requests for master data lookups (Products, Venodrs, Tax Codes, etc.).

import type { NextFunction, Request, Response } from "express";

// Core
import type { AuthenticatedRequest } from "@/types/express.types";
// Services
import { parseItemCodesParam } from "./master-data.batch-utils";
import { masterDataService } from "./master-data.service";

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
    const cardCode = typeof req.query.cardCode === "string" ? req.query.cardCode : undefined;
    const catalog =
      req.query.catalog === "purchase-quotation" ? ("purchase-quotation" as const) : undefined;
    const productsResult = catalog
      ? await masterDataService.getProducts(
          dbName,
          warehouseCode,
          search,
          limit,
          type,
          priceList,
          cardCode,
          catalog,
        )
      : await masterDataService.getProducts(
          dbName,
          warehouseCode,
          search,
          limit,
          type,
          priceList,
          cardCode,
        );
    res.status(200).json({ data: productsResult, success: true });
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
    const productWarehouseStocksResult = await masterDataService.getProductWarehouseStocks(
      dbName,
      itemCode,
    );
    res.status(200).json({ data: productWarehouseStocksResult, success: true });
  } catch (error) {
    next(error);
  }
};

export const getProductsByCodes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const codes = parseItemCodesParam(req.query.codes);
    const warehouseCode =
      typeof req.query.warehouseCode === "string" ? req.query.warehouseCode : undefined;
    const type = req.query.type as "sales" | "purchase" | undefined;
    const priceList =
      typeof req.query.priceList === "number"
        ? req.query.priceList
        : typeof req.query.priceList === "string" && req.query.priceList.trim() !== ""
          ? Number(req.query.priceList)
          : undefined;
    const cardCode = typeof req.query.cardCode === "string" ? req.query.cardCode : undefined;
    const catalog =
      req.query.catalog === "purchase-quotation" ? ("purchase-quotation" as const) : undefined;
    const productsResult = catalog
      ? await masterDataService.getProductsByCodes(
          dbName,
          codes,
          type,
          priceList,
          warehouseCode,
          cardCode,
          catalog,
        )
      : await masterDataService.getProductsByCodes(
          dbName,
          codes,
          type,
          priceList,
          warehouseCode,
          cardCode,
        );
    res.status(200).json({ data: productsResult, success: true });
  } catch (error) {
    next(error);
  }
};

export const getProductWarehouseStocksBatch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const itemCodes = parseItemCodesParam(req.query.itemCodes ?? req.query.codes);
    const warehouseCode =
      typeof req.query.warehouseCode === "string" ? req.query.warehouseCode : undefined;
    const stocksResult = await masterDataService.getProductWarehouseStocksBatch(
      dbName,
      itemCodes,
      warehouseCode,
    );
    res.status(200).json({ data: stocksResult, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves all vendors registered in the specific SAP company database.
export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const scope = req.query.scope === "intercompany" ? "intercompany" : undefined;
    const vendorsResult = await masterDataService.getVendors(dbName, scope);
    res.status(200).json({ data: vendorsResult, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves all customers registered in the specific SAP company database.
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const scope = req.query.scope === "intercompany" ? "intercompany" : undefined;
    const customersResult = await masterDataService.getCustomers(dbName, scope);
    res.status(200).json({ data: customersResult, success: true });
  } catch (error) {
    next(error);
  }
};

/** Lazy address list for one BP (bill/ship pickers on create pages). */
export const getBusinessPartnerAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const cardCode =
      typeof req.params.cardCode === "string"
        ? req.params.cardCode
        : Array.isArray(req.params.cardCode)
          ? String(req.params.cardCode[0] ?? "")
          : "";
    const addressesResult = await masterDataService.getBusinessPartnerAddresses(dbName, cardCode);
    res.status(200).json({ data: addressesResult, success: true });
  } catch (error) {
    next(error);
  }
};

// Returns a list of all active tax codes defined for the tenant.
export const getTaxCodes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const taxCodesResult = await masterDataService.getTaxCodes(dbName);
    res.status(200).json({ data: taxCodesResult, success: true });
  } catch (error) {
    next(error);
  }
};

// Fetches standard Units of Measure (UOMs) used for inventory and transactions.
export const getUOMs = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const uOMsResult = await masterDataService.getUOMs(dbName);
    res.status(200).json({ data: uOMsResult, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves the list of warehouses configured in the tenant's SAP system.
export const getWarehouses = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const warehousesResult = await masterDataService.getWarehouses(dbName);
    res.status(200).json({ data: warehousesResult, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves the list of price lists from SAP HANA (OPLN table).
export const getPriceLists = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const priceListsResult = await masterDataService.getPriceLists(dbName);
    res.status(200).json({ data: priceListsResult, success: true });
  } catch (error) {
    next(error);
  }
};

export const getSeries = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const documentType = typeof req.query.documentType === "string" ? req.query.documentType : "59";
    const seriesResult = await masterDataService.getSeries(dbName, documentType);
    res.status(200).json({ data: seriesResult, success: true });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseBins = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const warehouseCode = String(req.params.code);
    const warehouseBinsResult = await masterDataService.getWarehouseBins(dbName, warehouseCode);
    res.status(200).json({ data: warehouseBinsResult, success: true });
  } catch (error) {
    next(error);
  }
};

/** SAP business places (OBPL.BPLId) for multi-branch document header. */
export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const branchOptions = await masterDataService.getBusinessPlaces(dbName);
    res.status(200).json({ data: branchOptions, success: true });
  } catch (error) {
    next(error);
  }
};

export const getItemBatches = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const itemCode = typeof req.query.itemCode === "string" ? req.query.itemCode : "";
    const warehouseCode =
      typeof req.query.warehouseCode === "string" ? req.query.warehouseCode : "";
    const batchesResult = await masterDataService.getItemBatches(dbName, itemCode, warehouseCode);
    res.status(200).json({ data: batchesResult, success: true });
  } catch (error) {
    next(error);
  }
};

export const getItemDefaultBin = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const itemCode = typeof req.query.itemCode === "string" ? req.query.itemCode : "";
    const warehouseCode =
      typeof req.query.warehouseCode === "string" ? req.query.warehouseCode : "";
    const defaultBin = await masterDataService.getItemDefaultBin(dbName, itemCode, warehouseCode);
    res.status(200).json({ data: defaultBin, success: true });
  } catch (error) {
    next(error);
  }
};

export const getItemSerials = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const itemCode = typeof req.query.itemCode === "string" ? req.query.itemCode : "";
    const warehouseCode =
      typeof req.query.warehouseCode === "string" ? req.query.warehouseCode : "";
    const serialsResult = await masterDataService.getItemSerials(dbName, itemCode, warehouseCode);
    res.status(200).json({ data: serialsResult, success: true });
  } catch (error) {
    next(error);
  }
};

export const masterDataController = {
  getBusinessPartnerAddresses,
  getCustomers,
  getItemBatches,
  getItemDefaultBin,
  getItemSerials,
  getPriceLists,
  getProductWarehouseStocks,
  getProductWarehouseStocksBatch,
  getProducts,
  getProductsByCodes,
  getTaxCodes,
  getUOMs,
  getVendors,
  getWarehouses,
  getSeries,
  getWarehouseBins,
  getBranches,
};
