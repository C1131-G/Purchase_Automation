// Master Data Routes: Read-only endpoints for reference and lookup data.

import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { masterDataDal } from "@/dal/master-data.dal";

const router = Router();

router.use(validateSession);

router.get("/vendors", masterDataDal.getVendors);
router.get("/customers", masterDataDal.getCustomers);
router.get("/products", masterDataDal.getProducts);
router.get("/products/:itemCode/stock", masterDataDal.getProductWarehouseStocks);
router.get("/tax-codes", masterDataDal.getTaxCodes);
router.get("/TaxDeclarations", masterDataDal.getTaxCodes);
router.get("/uoms", masterDataDal.getUOMs);
router.get("/price-lists", masterDataDal.getPriceLists);
router.get("/warehouses", masterDataDal.getWarehouses);
router.get("/sales-employees", masterDataDal.getSalesEmployees);
router.get("/chart-of-accounts", masterDataDal.getChartOfAccounts);

export const masterDataRoutes = router;
