// A/R Invoice Routes: Endpoints for customers to view and pay their accounts receivable invoices.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { arInvoiceController } from "./ar-invoice.controller";
import { getInvoiceByDocNum } from "./ar-invoice.service";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { InvoiceDocNumLookupQuerySchema, InvoiceQuerySchema } from "./ar-invoice.schema";

const router = express.Router();

// Security: All A/R invoice operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a list of customer invoices, filtered by status or date.
router.get("/", validateQuery(InvoiceQuerySchema), arInvoiceController.getInvoices);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(InvoiceDocNumLookupQuerySchema),
  arInvoiceController.getInvoiceDocNums,
);

// GET /:id: Fetches full details for a single A/R invoice.
router.get("/:id", arInvoiceController.getInvoice);

// POST /: Entry point for generating a new A/R invoice.
router.post("/", arInvoiceController.createInvoice);

// PATCH /:id: Updates an existing A/R invoice.
router.patch("/:id", arInvoiceController.updateInvoice);

// POST /:id/cancel: Triggers a cancellation for the invoice in SAP.
router.post("/:id/cancel", arInvoiceController.cancelInvoice);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(getInvoiceByDocNum, "AR Invoice"),
);

// POST /:id/reopen: Triggers a reopen for the invoice in SAP.
router.post("/:id/reopen", arInvoiceController.reopenInvoice);

export const arInvoiceRoutes = router;
