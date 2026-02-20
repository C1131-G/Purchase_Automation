// A/P Credit Note Routes: Endpoints for vendors to manage credit memos and returns.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { apCreditNoteDal } from "@/dal/ap-credit-note.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  CreditNoteDocNumLookupQuerySchema,
  CreditNoteQuerySchema,
} from "@/validation/schemas/inputs/credit-note.input";

const router = express.Router();

// Security: All A/P credit note operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/P credit notes.
router.get("/", validateQuery(CreditNoteQuerySchema), apCreditNoteDal.getCreditNotes);
router.get(
  "/docnums",
  validateQuery(CreditNoteDocNumLookupQuerySchema),
  apCreditNoteDal.getCreditNoteDocNums,
);

// GET /:id: Fetches full details for a single A/P credit note.
router.get("/:id", apCreditNoteDal.getCreditNote);

// POST /: Creates a new A/P credit note in the backend.
router.post("/", apCreditNoteDal.createCreditNote);

// PATCH /:id: Modifies an existing A/P credit note.
router.patch("/:id", apCreditNoteDal.updateCreditNote);

// POST /:id/cancel: Cancels a credit note in SAP.
router.post("/:id/cancel", apCreditNoteDal.cancelCreditNote);

export const apCreditNoteRoutes = router;
