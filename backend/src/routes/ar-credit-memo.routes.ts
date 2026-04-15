// A/R Credit Memo Routes: Endpoints for customers to track credits and returns.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { arCreditMemoDal } from "@/dal/ar-credit-memo.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  CreditNoteDocNumLookupQuerySchema,
  CreditNoteQuerySchema,
} from "@/validation/schemas/inputs/credit-note.input";

const router = express.Router();

// Security: All A/R Credit Memo operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/R Credit Memos.
router.get("/", validateQuery(CreditNoteQuerySchema), arCreditMemoDal.getCreditNotes);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(CreditNoteDocNumLookupQuerySchema),
  arCreditMemoDal.getCreditNoteDocNums,
);

// GET /:id: Fetches full details for a single A/R Credit Memo.
router.get("/:id", arCreditMemoDal.getCreditNote);

// POST /: Entry point for generating an A/R Credit Memo from a return document.
router.post("/", arCreditMemoDal.createCreditNote);

// PATCH /:id: Updates an existing A/R Credit Memo.
router.patch("/:id", arCreditMemoDal.updateCreditNote);

// POST /:id/cancel: Triggers a cancellation for the credit note in SAP.
router.post("/:id/cancel", arCreditMemoDal.cancelCreditNote);

export const arCreditMemoRoutes = router;
