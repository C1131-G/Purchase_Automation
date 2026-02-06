// Master Data Routes: Read-only endpoints for common lookups and validation reference data.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { masterDataDal } from "@/dal/master-data.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { MasterDataQuerySchema } from "@/validation/schemas/inputs/master-data.input";

const router = express.Router();

// Security: Lookups are scoped to the active session's tenant database.
router.use(validateSession);

// GET /products: Searchable list of items from the OITM table.
router.get("/products", validateQuery(MasterDataQuerySchema), masterDataDal.getProducts);

// GET /vendors: Filtered list of Vendors ('S') from the OCRD table.
router.get("/vendors", validateQuery(MasterDataQuerySchema), masterDataDal.getVendors);

// GET /customers: Filtered list of Customers ('C') from the OCRD table.
router.get("/customers", validateQuery(MasterDataQuerySchema), masterDataDal.getCustomers);

// GET /TaxDeclarations: Retrieves active tax groups and rates for duty calculations on new documents.
router.get("/TaxDeclarations", masterDataDal.getTaxCodes);

// GET /uoms: List of standard units of measurement.
router.get("/uoms", validateQuery(MasterDataQuerySchema), masterDataDal.getUOMs);

// GET /warehouses: List of available storage locations for item selection.
router.get("/warehouses", validateQuery(MasterDataQuerySchema), masterDataDal.getWarehouses);

export const masterDataRoutes = router;
