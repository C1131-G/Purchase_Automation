// Sales Quotation Routes: Endpoints for customers to view and manage their Sales Quotations.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { createExportHandler } from "@/dal/export.dal";
import { salesQuotationDal } from "@/dal/sales-quotation.dal";
import { getSalesQuotationByDocNum } from "@/services/sales-quotation.service";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  SalesQuotationDocNumLookupQuerySchema,
  SalesQuotationQuerySchema,
} from "@/validation/schemas/inputs/sales-quotation.input";

const router = express.Router();

// Security: All sales quotation operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of sales quotations with tenant-specific filtering.
router.get("/", validateQuery(SalesQuotationQuerySchema), salesQuotationDal.getSalesQuotations);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(SalesQuotationDocNumLookupQuerySchema),
  salesQuotationDal.getSalesQuotationDocNums,
);
router.get("/open-lines", salesQuotationDal.getOpenSalesQuotationLines);

// GET /SalesEmployee: Lookup for finding which sales personnel are assigned to the current tenant.
router.get("/SalesEmployee", salesQuotationDal.getSalesEmployees);

// GET /by-doc-num/:docNum: Fetches full details for a single sales quotation.
router.get("/by-doc-num/:docNum", salesQuotationDal.getSalesQuotationByDocNum);

// GET /:id: Fetches full details for a single sales quotation by internal ID.
router.get("/:id", salesQuotationDal.getSalesQuotation);

// POST /: Submits a new sales quotation into the SAP system.
router.post("/", salesQuotationDal.createSalesQuotation);

// PATCH /:id: Modifies an existing open sales quotation.
router.patch("/:id", salesQuotationDal.updateSalesQuotation);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(getSalesQuotationByDocNum, "Sales Quotation"),
);

// POST /:id/cancel: Marks a sales quotation as canceled in the backend.
router.post("/:id/cancel", salesQuotationDal.cancelSalesQuotation);

export const salesQuotationRoutes = router;
