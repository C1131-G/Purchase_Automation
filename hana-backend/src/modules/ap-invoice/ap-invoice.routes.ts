// A/P Invoice Routes: Endpoints for vendors to track and manage their accounts payable invoices.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { apInvoiceController } from "./ap-invoice.controller";
import { getInvoiceByDocNum } from "./ap-invoice.service";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { InvoiceDocNumLookupQuerySchema, InvoiceQuerySchema } from "./ap-invoice.schema";

const router = express.Router();

// Security: All A/P invoice operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/P invoices with tenant and vendor filtering.
router.get("/", validateQuery(InvoiceQuerySchema), apInvoiceController.getInvoices);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(InvoiceDocNumLookupQuerySchema),
  apInvoiceController.getInvoiceDocNums,
);

// GET /:id: Fetches full details for a single A/P invoice.
router.get("/:id", apInvoiceController.getInvoice);

// POST /: Entry point for submitting a new A/P invoice (often from a GRPO).
router.post("/", apInvoiceController.createInvoice);

// PATCH /:id: Updates an existing open A/P invoice.
router.patch("/:id", apInvoiceController.updateInvoice);

// POST /:id/cancel: Triggers a cancellation for the invoice in SAP.
router.post("/:id/cancel", apInvoiceController.cancelInvoice);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(getInvoiceByDocNum, "AP Invoice"),
);

// POST /:id/reopen: Triggers a reopen for the invoice in SAP.
router.post("/:id/reopen", apInvoiceController.reopenInvoice);

export const apInvoiceRoutes = router;
