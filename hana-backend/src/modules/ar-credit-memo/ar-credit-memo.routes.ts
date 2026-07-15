// A/R Credit Memo Routes: Endpoints for customers to track credits and returns.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { arCreditMemoController } from "./ar-credit-memo.controller";
import { getCreditNoteByDocNum } from "./ar-credit-memo.service";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { CreditNoteDocNumLookupQuerySchema, CreditNoteQuerySchema } from "./ar-credit-memo.schema";

const router = express.Router();

// Security: All A/R Credit Memo operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of A/R Credit Memos.
router.get("/", validateQuery(CreditNoteQuerySchema), arCreditMemoController.getCreditNotes);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(CreditNoteDocNumLookupQuerySchema),
  arCreditMemoController.getCreditNoteDocNums,
);

// GET /:id: Fetches full details for a single A/R Credit Memo.
router.get("/:id", arCreditMemoController.getCreditNote);

// POST /: Entry point for generating an A/R Credit Memo from a return document.
router.post("/", arCreditMemoController.createCreditNote);

// PATCH /:id: Updates an existing A/R Credit Memo.
router.patch("/:id", arCreditMemoController.updateCreditNote);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(getCreditNoteByDocNum, "AR Credit Memo"),
);

// POST /:id/cancel: Triggers a cancellation for the credit note in SAP.
router.post("/:id/cancel", arCreditMemoController.cancelCreditNote);

export const arCreditMemoRoutes = router;
