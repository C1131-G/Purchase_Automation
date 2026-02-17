// GRPO Routes: Endpoints for Goods Receipt PO operations, enabling vendors to record the delivery of items.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { grpoDal } from "@/dal/grpo.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { AvailablePOsQuerySchema, GRPOQuerySchema } from "@/validation/schemas/inputs/grpo.input";

const router = express.Router();

// Security: All GRPO operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of existing GRPOs.
router.get("/", validateQuery(GRPOQuerySchema), grpoDal.getGRPOs);

// GET /available-pos: Helper for the 'Create GRPO' UI. Finds Open Purchase Orders that have items yet to be received.
router.get("/available-pos", validateQuery(AvailablePOsQuerySchema), grpoDal.getAvailablePOs);

// GET /po-detail/:id: Fetches open lines from a specific PO to populate the GRPO creation form.
router.get("/po-detail/:id", grpoDal.getPODetail);

// GET /:id: Fetches full details for a single completed GRPO.
router.get("/:id", grpoDal.getGRPO);

// POST /: Entry point for creating a new GRPO from a PO.
router.post("/", grpoDal.createGRPO);

// PATCH /:id: Updates non-locked fields of an existing GRPO.
router.patch("/:id", grpoDal.updateGRPO);

// POST /:id/cancel: Cancels a GRPO (Note: SAP behavior for cancellation after document creation is complex).
router.post("/:id/cancel", grpoDal.cancelGRPO);

export const grpoRoutes = router;
