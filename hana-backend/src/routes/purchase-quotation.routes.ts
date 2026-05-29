// Purchase Quotation Routes: Endpoints for vendors to view and manage their Purchase Quotations.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { purchaseQuotationDal } from "@/dal/purchase-quotation.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  PurchaseQuotationDocNumLookupQuerySchema,
  PurchaseQuotationQuerySchema,
} from "@/validation/schemas/inputs/purchase-quotation.input";

const router = express.Router();

// Security: All purchase quotation operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of purchase quotations with tenant-specific filtering.
router.get(
  "/",
  validateQuery(PurchaseQuotationQuerySchema),
  purchaseQuotationDal.getPurchaseQuotations,
);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PurchaseQuotationDocNumLookupQuerySchema),
  purchaseQuotationDal.getPurchaseQuotationDocNums,
);
router.get("/open-lines", purchaseQuotationDal.getOpenPurchaseQuotationLines);

// GET /SalesEmployee: Lookup for finding which sales personnel are assigned to the current tenant.
router.get("/SalesEmployee", purchaseQuotationDal.getSalesEmployees);

// GET /by-doc-num/:docNum: Fetches full details for a single purchase quotation.
router.get("/by-doc-num/:docNum", purchaseQuotationDal.getPurchaseQuotationByDocNum);

// GET /:id: Fetches full details for a single purchase quotation by internal ID.
router.get("/:id", purchaseQuotationDal.getPurchaseQuotation);

// POST /: Submits a new purchase quotation into the SAP system.
router.post("/", purchaseQuotationDal.createPurchaseQuotation);

// PATCH /:id: Modifies an existing open purchase quotation.
router.patch("/:id", purchaseQuotationDal.updatePurchaseQuotation);

// POST /:id/cancel: Marks a purchase quotation as canceled in the backend.
router.post("/:id/cancel", purchaseQuotationDal.cancelPurchaseQuotation);

export const purchaseQuotationRoutes = router;
