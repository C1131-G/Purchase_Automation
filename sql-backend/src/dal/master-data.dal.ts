// Master Data DAL: Handles master data lookups.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { getTenantDataSource } from "@/db/config/data-source";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

const getDbName = (req: Request) => (req as unknown as AuthenticatedRequest).user?.dbName || "";

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(ItemSchema);

    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";

    const where = search ? { itemCode: require("typeorm").Like(`%${search}%`) } : {};

    const [data, total] = await repo.findAndCount({
      order: { itemCode: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    res.status(200).json({ data, limit, page, success: true, total });
  } catch (error) {
    next(error);
  }
};

export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(BusinessPartnerSchema);

    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;

    const [data, total] = await repo.findAndCount({
      order: { cardCode: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
      where: { cardType: "S" },
    });

    res.status(200).json({ data, limit, page, success: true, total });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(BusinessPartnerSchema);

    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;

    const [data, total] = await repo.findAndCount({
      order: { cardCode: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
      where: { cardType: "C" },
    });

    res.status(200).json({ data, limit, page, success: true, total });
  } catch (error) {
    next(error);
  }
};

export const getWarehouses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(WarehouseSchema);

    const [data, total] = await repo.findAndCount({
      order: { whsCode: "ASC" },
    });

    res.status(200).json({ data, success: true, total });
  } catch (error) {
    next(error);
  }
};

export const getUOMs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(UnitOfMeasurementSchema);

    const [data, total] = await repo.findAndCount({
      order: { uomCode: "ASC" },
    });

    res.status(200).json({ data, success: true, total });
  } catch (error) {
    next(error);
  }
};

export const getTaxCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(TaxGroupSchema);

    const data = await repo.find();

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const masterDataDal = {
  getCustomers,
  getProducts,
  getTaxCodes,
  getUOMs,
  getVendors,
  getWarehouses,
};
