import type { RequestHandler } from "express";

import { masterDataService } from "./master-data.service";

export const getProducts: RequestHandler = async (req, res, next) => {
  try {
    const { warehouseCode, search, limit, type, priceList } = req.query;
    const result = await masterDataService.getProducts({
      limit: limit === null || limit === undefined ? undefined : Number(limit),
      priceList: priceList === null || priceList === undefined ? undefined : Number(priceList),
      search: typeof search === "string" ? search : undefined,
      type: type === "sales" || type === "purchase" ? type : undefined,
      warehouseCode: typeof warehouseCode === "string" ? warehouseCode : undefined,
    });
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getProductWarehouseStocks: RequestHandler = async (req, res, next) => {
  try {
    const itemCode = (req.params.itemCode || req.query.itemCode || "") as string;
    const result = await masterDataService.getProductWarehouseStocks(itemCode);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getVendors: RequestHandler = async (req, res, next) => {
  try {
    const result = await masterDataService.getVendors(
      typeof req.query.search === "string" ? req.query.search : undefined,
    );
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getCustomers: RequestHandler = async (req, res, next) => {
  try {
    const result = await masterDataService.getCustomers(
      typeof req.query.search === "string" ? req.query.search : undefined,
    );
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getTaxCodes: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getTaxCodes();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getUOMs: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getUOMs();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getPriceLists: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getPriceLists();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getWarehouses: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getWarehouses();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getSalesEmployees: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getSalesEmployees();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getChartOfAccounts: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getChartOfAccounts();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getBranches: RequestHandler = (_req, res, next) => {
  try {
    const result = [
      { Code: "01", Name: "Branch 1" },
      { Code: "02", Name: "Branch 2" },
      { Code: "03", Name: "Branch 3" },
      { Code: "04", Name: "Branch 4" },
      { Code: "05", Name: "Branch 5" },
    ];
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryAdjustmentReasons: RequestHandler = (req, res, next) => {
  try {
    const type = req.query.type as string;
    const result =
      type === "issue"
        ? [
            { code: "01", name: "Damaged Goods" },
            { code: "02", name: "Internal Consumption" },
            { code: "03", name: "Expired Stock" },
          ]
        : [
            { code: "01", name: "Purchase Return" },
            { code: "02", name: "Stock Initialization" },
            { code: "03", name: "Production Surplus" },
          ];
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const masterDataController = {
  getBranches,
  getChartOfAccounts,
  getCustomers,
  getInventoryAdjustmentReasons,
  getPriceLists,
  getProductWarehouseStocks,
  getProducts,
  getSalesEmployees,
  getTaxCodes,
  getUOMs,
  getVendors,
  getWarehouses,
};
