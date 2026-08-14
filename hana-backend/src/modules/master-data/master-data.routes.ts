// Master Data Routes: Read-only endpoints for common lookups and validation reference data.

import express from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { masterDataController } from "./master-data.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { MasterDataQuerySchema } from "./master-data.schema";

const router = express.Router();

// Security: Lookups are scoped to the active session's tenant database.
router.use(validateSession);

// GET /products: Searchable list of items from the OITM table.
router.get("/products", validateQuery(MasterDataQuerySchema), masterDataController.getProducts);

// GET /product-warehouse-stocks: Stock for selected product across all warehouses.
router.get(
  "/product-warehouse-stocks",
  validateQuery(MasterDataQuerySchema),
  masterDataController.getProductWarehouseStocks,
);

// GET /products-by-codes: Exact ItemCode list for document hydrate (O(1) network).
router.get(
  "/products-by-codes",
  validateQuery(MasterDataQuerySchema),
  masterDataController.getProductsByCodes,
);

// GET /product-warehouse-stocks-batch: Stock for many items in one HANA round-trip.
router.get(
  "/product-warehouse-stocks-batch",
  validateQuery(MasterDataQuerySchema),
  masterDataController.getProductWarehouseStocksBatch,
);

// GET /vendors: Filtered list of Vendors ('S') from the OCRD table.
// List is slim: default bill/ship only (no full addresses[]).
router.get("/vendors", validateQuery(MasterDataQuerySchema), masterDataController.getVendors);

// GET /customers: Filtered list of Customers ('C') from the OCRD table.
// List is slim: default bill/ship only (no full addresses[]).
router.get("/customers", validateQuery(MasterDataQuerySchema), masterDataController.getCustomers);

// GET /business-partners/:cardCode/addresses: Lazy full address list for one BP.
router.get(
  "/business-partners/:cardCode/addresses",
  masterDataController.getBusinessPartnerAddresses,
);

// GET /TaxDeclarations: Retrieves active tax groups and rates for duty calculations on new documents.
router.get("/TaxDeclarations", masterDataController.getTaxCodes);

// GET /uoms: List of standard units of measurement.
router.get("/uoms", validateQuery(MasterDataQuerySchema), masterDataController.getUOMs);

// GET /warehouses: List of available storage locations for item selection.
router.get("/warehouses", validateQuery(MasterDataQuerySchema), masterDataController.getWarehouses);

// GET /price-lists: List of price lists defined in SAP HANA (OPLN table).
router.get("/price-lists", masterDataController.getPriceLists);

// GET /series: List of document series from Service Layer
router.get("/series", masterDataController.getSeries);

// GET /warehouses/:code/bins: List of bins for a warehouse from Service Layer
router.get("/warehouses/:code/bins", masterDataController.getWarehouseBins);

// GET /branches: List of branches (DistributionRules) from Service Layer
router.get("/branches", masterDataController.getBranches);

// GET /item-batches: On-hand batches (OBTN + OBTQ) for item + warehouse.
router.get(
  "/item-batches",
  validateQuery(MasterDataQuerySchema),
  masterDataController.getItemBatches,
);

// GET /item-serials: Available serials (OSRQ/OSRN or OSRI) for item + warehouse.
router.get(
  "/item-serials",
  validateQuery(MasterDataQuerySchema),
  masterDataController.getItemSerials,
);

// GET /item-default-bin: OITW.DftBinAbs + OBIN for item + warehouse.
router.get(
  "/item-default-bin",
  validateQuery(MasterDataQuerySchema),
  masterDataController.getItemDefaultBin,
);

export const masterDataRoutes = router;
