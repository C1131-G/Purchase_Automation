// A/R Invoice Routes: Endpoints for customers to view and pay their accounts receivable invoices.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { createExportHandler } from "@/dal/export.dal";
import { arInvoiceDal } from "@/dal/ar-invoice.dal";
import { getInvoiceByDocNum } from "@/services/ar-invoice.service";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  InvoiceDocNumLookupQuerySchema,
  InvoiceQuerySchema,
} from "@/validation/schemas/inputs/invoice.input";

const router = express.Router();

// Security: All A/R invoice operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a list of customer invoices, filtered by status or date.
router.get("/", validateQuery(InvoiceQuerySchema), arInvoiceDal.getInvoices);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(InvoiceDocNumLookupQuerySchema),
  arInvoiceDal.getInvoiceDocNums,
);

// GET /:id: Fetches full details for a single A/R invoice.
router.get("/:id", arInvoiceDal.getInvoice);

// POST /: Entry point for generating a new A/R invoice.
router.post("/", arInvoiceDal.createInvoice);

// PATCH /:id: Updates an existing A/R invoice.
router.patch("/:id", arInvoiceDal.updateInvoice);

// POST /:id/cancel: Triggers a cancellation for the invoice in SAP.
router.post("/:id/cancel", arInvoiceDal.cancelInvoice);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(getInvoiceByDocNum, "AR Invoice"),
);

// POST /:id/reopen: Triggers a reopen for the invoice in SAP.
router.post("/:id/reopen", arInvoiceDal.reopenInvoice);

export const arInvoiceRoutes = router;
