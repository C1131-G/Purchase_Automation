import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { masterDataController } from "./master-data.controller";

const router = Router();
router.use(validateSession);

router.get("/vendors", masterDataController.getVendors);
router.get("/customers", masterDataController.getCustomers);
router.get("/products", masterDataController.getProducts);
router.get("/products/:itemCode/stock", masterDataController.getProductWarehouseStocks);
router.get("/product-warehouse-stocks", masterDataController.getProductWarehouseStocks);
router.get("/tax-codes", masterDataController.getTaxCodes);
router.get("/TaxDeclarations", masterDataController.getTaxCodes);
router.get("/uoms", masterDataController.getUOMs);
router.get("/price-lists", masterDataController.getPriceLists);
router.get("/warehouses", masterDataController.getWarehouses);
router.get("/sales-employees", masterDataController.getSalesEmployees);
router.get("/chart-of-accounts", masterDataController.getChartOfAccounts);
router.get("/branches", masterDataController.getBranches);
router.get("/inventory-adjustment-reasons", masterDataController.getInventoryAdjustmentReasons);

export const masterDataRoutes = router;
