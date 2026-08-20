// Purchase Quotation Routes: Endpoints for vendors to view and manage their Purchase Quotations.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { purchaseQuotationController } from "./purchase-quotation.controller";
import { getPurchaseQuotationByDocNum } from "./purchase-quotation.service";
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
  CreatePurchaseQuotationInputSchema,
  PurchaseQuotationDocNumLookupQuerySchema,
  PurchaseQuotationQuerySchema,
  UpdatePurchaseQuotationInputSchema,
} from "./purchase-quotation.schema";

const router = express.Router();

// Security: All purchase quotation operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of purchase quotations with tenant-specific filtering.
router.get(
  "/",
  validateQuery(PurchaseQuotationQuerySchema),
  purchaseQuotationController.getPurchaseQuotations,
);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PurchaseQuotationDocNumLookupQuerySchema),
  purchaseQuotationController.getPurchaseQuotationDocNums,
);
router.get("/open-lines", purchaseQuotationController.getOpenPurchaseQuotationLines);

// GET /SalesEmployee: Lookup for finding which sales personnel are assigned to the current tenant.
router.get("/SalesEmployee", purchaseQuotationController.getSalesEmployees);

// GET /by-doc-num/:docNum: Fetches full details for a single purchase quotation.
router.get(
  "/by-doc-num/:docNum",
  validateParams(SapDocumentNumberParamsSchema),
  purchaseQuotationController.getPurchaseQuotationByDocNum,
);

// GET /:id: Fetches full details for a single purchase quotation by internal ID.
router.get(
  "/:id",
  validateParams(SapDocumentIdParamsSchema),
  purchaseQuotationController.getPurchaseQuotation,
);

// POST /: Submits a new purchase quotation into the SAP system.
router.post(
  "/",
  validateBody(CreatePurchaseQuotationInputSchema),
  purchaseQuotationController.createPurchaseQuotation,
);

// PATCH /:id: Modifies an existing open purchase quotation.
router.patch(
  "/:id",
  validateParams(SapDocumentIdParamsSchema),
  validateBody(UpdatePurchaseQuotationInputSchema),
  purchaseQuotationController.updatePurchaseQuotation,
);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  validateParams(SapDocumentNumberParamsSchema),
  createExportHandler(getPurchaseQuotationByDocNum, "Purchase Quotation"),
);

// POST /:id/cancel: Marks a purchase quotation as canceled in the backend.
router.post(
  "/:id/cancel",
  validateParams(SapDocumentIdParamsSchema),
  purchaseQuotationController.cancelPurchaseQuotation,
);

export const purchaseQuotationRoutes = router;
