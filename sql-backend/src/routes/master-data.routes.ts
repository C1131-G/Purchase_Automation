import express from "express";
import { Like } from "typeorm";

import { validateSession } from "@/core/middleware/session.middleware";
import { getTenantDataSource } from "@/db/config/data-source";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

const router = express.Router();

router.use(validateSession);

const getDbName = (req: express.Request) =>
  (req as express.Request & { user: { dbName: string } }).user?.dbName || "";

router.get("/products", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(ItemSchema);

    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";

    const where = search ? { itemCode: Like(`%${search}%`) } : {};

    const [data, total] = await repo.findAndCount({
      order: { itemCode: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    res.status(200).json({
      data,
      limit,
      page,
      success: true,
      total,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/vendors", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(BusinessPartnerSchema);

    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";

    const where = search ? { cardCode: Like(`%${search}%`), cardType: "S" } : { cardType: "S" };

    const [data, total] = await repo.findAndCount({
      order: { cardCode: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    res.status(200).json({ data, limit, page, success: true, total });
  } catch (error) {
    next(error);
  }
});

router.get("/customers", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(BusinessPartnerSchema);

    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";

    const where = search ? { cardCode: Like(`%${search}%`), cardType: "C" } : { cardType: "C" };

    const [data, total] = await repo.findAndCount({
      order: { cardCode: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    res.status(200).json({ data, limit, page, success: true, total });
  } catch (error) {
    next(error);
  }
});

router.get("/warehouses", async (req, res, next) => {
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
});

router.get("/uoms", async (req, res, next) => {
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
});

router.get("/TaxDeclarations", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const ds = await getTenantDataSource(dbName);
    const repo = ds.getRepository(TaxGroupSchema);

    const data = await repo.find();

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

export const masterDataRoutes = router;
