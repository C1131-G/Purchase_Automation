import type { RequestHandler } from "express";

import { masterDataService } from "@/services/master-data.service";

export const getProducts: RequestHandler = async (req, res, next) => {
  try {
    const { warehouseCode, search, limit, type, priceList } = req.query;
    const result = await masterDataService.getProducts({
      warehouseCode: typeof warehouseCode === "string" ? warehouseCode : undefined,
      search: typeof search === "string" ? search : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      type: type === "sales" || type === "purchase" ? type : undefined,
      priceList: typeof priceList === "string" ? Number(priceList) : undefined,
    });
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getProductWarehouseStocks: RequestHandler = async (req, res, next) => {
  try {
    const itemCode = (req.params.itemCode || req.query.itemCode || "") as string;
    const result = await masterDataService.getProductWarehouseStocks(itemCode);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getVendors: RequestHandler = async (req, res, next) => {
  try {
    const result = await masterDataService.getVendors(
      typeof req.query.search === "string" ? req.query.search : undefined,
    );
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getCustomers: RequestHandler = async (req, res, next) => {
  try {
    const result = await masterDataService.getCustomers(
      typeof req.query.search === "string" ? req.query.search : undefined,
    );
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getTaxCodes: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getTaxCodes();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getUOMs: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getUOMs();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getPriceLists: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getPriceLists();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getWarehouses: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getWarehouses();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getSalesEmployees: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getSalesEmployees();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const getChartOfAccounts: RequestHandler = async (_req, res, next) => {
  try {
    const result = await masterDataService.getChartOfAccounts();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const masterDataDal = {
  getChartOfAccounts,
  getCustomers,
  getPriceLists,
  getProductWarehouseStocks,
  getProducts,
  getSalesEmployees,
  getTaxCodes,
  getUOMs,
  getVendors,
  getWarehouses,
};
