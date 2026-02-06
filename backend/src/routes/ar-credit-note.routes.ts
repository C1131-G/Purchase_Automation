// A/R Credit Note Routes: Endpoints for customers to track credits and returns.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { arCreditNoteDal } from "@/dal/ar-credit-note.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { CreditNoteQuerySchema } from "@/validation/schemas/inputs/credit-note.input";

const router = express.Router();

// Security: All A/R credit note operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/R credit notes.
router.get("/", validateQuery(CreditNoteQuerySchema), arCreditNoteDal.getCreditNotes);

// GET /:id: Fetches full details for a single A/R credit note.
router.get("/:id", arCreditNoteDal.getCreditNote);

// POST /: Entry point for generating an A/R credit note from a return document.
router.post("/", arCreditNoteDal.createCreditNote);

// PATCH /:id: Updates an existing A/R credit note.
router.patch("/:id", arCreditNoteDal.updateCreditNote);

// POST /:id/cancel: Triggers a cancellation for the credit note in SAP.
router.post("/:id/cancel", arCreditNoteDal.cancelCreditNote);

export const arCreditNoteRoutes = router;
