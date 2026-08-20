// Sales Quotation Routes: Endpoints for customers to view and manage their Sales Quotations.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { salesQuotationController } from "./sales-quotation.controller";
import { getSalesQuotationByDocNum } from "./sales-quotation.service";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/middleware/validation.middleware";
import {
  SapDocumentIdParamsSchema,
  SapDocumentNumberParamsSchema,
} from "@/validation/schemas/inputs/common.input";
import {
  CreateSalesQuotationInputSchema,
  SalesQuotationDocNumLookupQuerySchema,
  SalesQuotationQuerySchema,
  UpdateSalesQuotationInputSchema,
} from "./sales-quotation.schema";

const router = express.Router();

// Security: All sales quotation operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of sales quotations with tenant-specific filtering.
router.get(
  "/",
  validateQuery(SalesQuotationQuerySchema),
  salesQuotationController.getSalesQuotations,
);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(SalesQuotationDocNumLookupQuerySchema),
  salesQuotationController.getSalesQuotationDocNums,
);
router.get("/open-lines", salesQuotationController.getOpenSalesQuotationLines);

// GET /SalesEmployee: Lookup for finding which sales personnel are assigned to the current tenant.
router.get("/SalesEmployee", salesQuotationController.getSalesEmployees);

// GET /by-doc-num/:docNum: Fetches full details for a single sales quotation.
router.get(
  "/by-doc-num/:docNum",
  validateParams(SapDocumentNumberParamsSchema),
  salesQuotationController.getSalesQuotationByDocNum,
);

// GET /:id: Fetches full details for a single sales quotation by internal ID.
router.get(
  "/:id",
  validateParams(SapDocumentIdParamsSchema),
  salesQuotationController.getSalesQuotation,
);

// POST /: Submits a new sales quotation into the SAP system.
router.post(
  "/",
  validateBody(CreateSalesQuotationInputSchema),
  salesQuotationController.createSalesQuotation,
);

// PATCH /:id: Modifies an existing open sales quotation.
router.patch(
  "/:id",
  validateParams(SapDocumentIdParamsSchema),
  validateBody(UpdateSalesQuotationInputSchema),
  salesQuotationController.updateSalesQuotation,
);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  validateParams(SapDocumentNumberParamsSchema),
  createExportHandler(getSalesQuotationByDocNum, "Sales Quotation"),
);

// POST /:id/cancel: Marks a sales quotation as canceled in the backend.
router.post(
  "/:id/cancel",
  validateParams(SapDocumentIdParamsSchema),
  salesQuotationController.cancelSalesQuotation,
);

export const salesQuotationRoutes = router;
