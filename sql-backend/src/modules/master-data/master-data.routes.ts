import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { masterDataDal } from "./master-data.controller";

const router = Router();
router.use(validateSession);

router.get("/vendors", masterDataDal.getVendors);
router.get("/customers", masterDataDal.getCustomers);
router.get("/products", masterDataDal.getProducts);
router.get("/products/:itemCode/stock", masterDataDal.getProductWarehouseStocks);
router.get("/product-warehouse-stocks", masterDataDal.getProductWarehouseStocks);
router.get("/tax-codes", masterDataDal.getTaxCodes);
router.get("/TaxDeclarations", masterDataDal.getTaxCodes);
router.get("/uoms", masterDataDal.getUOMs);
router.get("/price-lists", masterDataDal.getPriceLists);
router.get("/warehouses", masterDataDal.getWarehouses);
router.get("/sales-employees", masterDataDal.getSalesEmployees);
router.get("/chart-of-accounts", masterDataDal.getChartOfAccounts);
router.get("/branches", masterDataDal.getBranches);
router.get("/inventory-adjustment-reasons", masterDataDal.getInventoryAdjustmentReasons);

export const masterDataRoutes = router;
