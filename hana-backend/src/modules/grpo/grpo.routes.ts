// GRPO Routes: Endpoints for Goods Receipt PO operations, enabling vendors to record the delivery of items.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { grpoController } from "./grpo.controller";
import { getGRPOByDocNum } from "./grpo.service";
import { validateQuery } from "@/core/middleware/validation.middleware";
import {
  AvailablePOsQuerySchema,
  GRPODocNumLookupQuerySchema,
  GRPOQuerySchema,
} from "./grpo.schema";

const router = express.Router();

// Security: All GRPO operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of existing GRPOs.
router.get("/", validateQuery(GRPOQuerySchema), grpoController.getGRPOs);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(GRPODocNumLookupQuerySchema),
  grpoController.getGRPODocNums,
);

// GET /available-pos: Helper for the 'Create GRPO' UI. Finds Open Purchase Orders that have items yet to be received.
router.get(
  "/available-pos",
  validateQuery(AvailablePOsQuerySchema),
  grpoController.getAvailablePOs,
);

// GET /po-detail/:id: Fetches open lines from a specific PO to populate the GRPO creation form.
router.get("/po-detail/:id", grpoController.getPODetail);

// GET /:id: Fetches full details for a single completed GRPO.
router.get("/:id", grpoController.getGRPO);

// POST /: Entry point for creating a new GRPO from a PO.
router.post("/", grpoController.createGRPO);

// PATCH /:id: Updates non-locked fields of an existing GRPO.
router.patch("/:id", grpoController.updateGRPO);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get("/by-doc-num/:docNum/export/:format", createExportHandler(getGRPOByDocNum, "GRPO"));

// POST /:id/cancel: Cancels a GRPO (Note: SAP behavior for cancellation after document creation is complex).
router.post("/:id/cancel", grpoController.cancelGRPO);

export const grpoRoutes = router;
