// A/P Credit Memo Routes: Endpoints for vendors to manage credit memos and returns.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { apCreditMemoDal } from "@/dal/ap-credit-memo.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  CreditNoteDocNumLookupQuerySchema,
  CreditNoteQuerySchema,
} from "@/validation/schemas/inputs/credit-note.input";

const router = express.Router();

// Security: All A/P credit memo operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/P credit memos.
router.get("/", validateQuery(CreditNoteQuerySchema), apCreditMemoDal.getCreditNotes);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(CreditNoteDocNumLookupQuerySchema),
  apCreditMemoDal.getCreditNoteDocNums,
);

// GET /:id: Fetches full details for a single A/P credit memo.
router.get("/:id", apCreditMemoDal.getCreditNote);

// POST /: Creates a new A/P credit memo in the backend.
router.post("/", apCreditMemoDal.createCreditNote);

// PATCH /:id: Modifies an existing A/P credit memo.
router.patch("/:id", apCreditMemoDal.updateCreditNote);

// POST /:id/cancel: Cancels a credit memo in SAP.
router.post("/:id/cancel", apCreditMemoDal.cancelCreditNote);

export const apCreditMemoRoutes = router;
