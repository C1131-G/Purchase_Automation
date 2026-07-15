// A/P Credit Memo Routes: Endpoints for vendors to manage credit memos and returns.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { apCreditMemoController } from "./ap-credit-memo.controller";
import { getCreditNoteByDocNum } from "./ap-credit-memo.service";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { CreditNoteDocNumLookupQuerySchema, CreditNoteQuerySchema } from "./ap-credit-memo.schema";

const router = express.Router();

// Security: All A/P credit memo operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/P credit memos.
router.get("/", validateQuery(CreditNoteQuerySchema), apCreditMemoController.getCreditNotes);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(CreditNoteDocNumLookupQuerySchema),
  apCreditMemoController.getCreditNoteDocNums,
);

// GET /:id: Fetches full details for a single A/P credit memo.
router.get("/:id", apCreditMemoController.getCreditNote);

// POST /: Creates a new A/P credit memo in the backend.
router.post("/", apCreditMemoController.createCreditNote);

// PATCH /:id: Modifies an existing A/P credit memo.
router.patch("/:id", apCreditMemoController.updateCreditNote);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(getCreditNoteByDocNum, "AP Credit Memo"),
);

// POST /:id/cancel: Cancels a credit memo in SAP.
router.post("/:id/cancel", apCreditMemoController.cancelCreditNote);

export const apCreditMemoRoutes = router;
