// A/P Invoice Routes: Endpoints for vendors to track and manage their accounts payable invoices.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { apInvoiceDal } from "@/dal/ap-invoice.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { InvoiceQuerySchema } from "@/validation/schemas/inputs/invoice.input";

const router = express.Router();

// Security: All A/P invoice operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/P invoices with tenant and vendor filtering.
router.get("/", validateQuery(InvoiceQuerySchema), apInvoiceDal.getInvoices);

// GET /:id: Fetches full details for a single A/P invoice.
router.get("/:id", apInvoiceDal.getInvoice);

// POST /: Entry point for submitting a new A/P invoice (often from a GRPO).
router.post("/", apInvoiceDal.createInvoice);

// PATCH /:id: Updates an existing open A/P invoice.
router.patch("/:id", apInvoiceDal.updateInvoice);

// POST /:id/cancel: Triggers a cancellation for the invoice in SAP.
router.post("/:id/cancel", apInvoiceDal.cancelInvoice);

export const apInvoiceRoutes = router;
