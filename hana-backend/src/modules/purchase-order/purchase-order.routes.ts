// Purchase Order Routes: Endpoints for vendors to interact with procurement documents.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { purchaseOrderController } from "./purchase-order.controller";
import { getPurchaseOrderByDocNum } from "./purchase-order.service";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/middleware/validation.middleware";
import {
  SapDocumentIdParamsSchema,
  SapDocumentNumberParamsSchema,
} from "@/validation/schemas/inputs/common.input";
import {
  CreatePurchaseOrderInputSchema,
  PurchaseOrderDocNumLookupQuerySchema,
  PurchaseOrderQuerySchema,
  UpdatePurchaseOrderInputSchema,
} from "./purchase-order.schema";

const router = express.Router();

// Security: All purchase order operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of POs, optionally filtered by date or document number.
router.get("/", validateQuery(PurchaseOrderQuerySchema), purchaseOrderController.getPurchaseOrders);

// GET /docnums: Retrieves distinct DocNum values for lookup suggestions.
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PurchaseOrderDocNumLookupQuerySchema),
  purchaseOrderController.getPurchaseOrderDocNums,
);

// GET /:id: Fetches full details for a single PO, including line items.
router.get(
  "/by-doc-num/:docNum",
  validateParams(SapDocumentNumberParamsSchema),
  purchaseOrderController.getPurchaseOrderByDocNum,
);

// GET /:id: Fetches full details for a single PO, including line items.
router.get(
  "/:id",
  validateParams(SapDocumentIdParamsSchema),
  purchaseOrderController.getPurchaseOrder,
);

// POST /: Entry point for creating a new PO.
router.post(
  "/",
  validateBody(CreatePurchaseOrderInputSchema),
  purchaseOrderController.createPurchaseOrder,
);

// PATCH /:id: Updates an existing draft or open PO.
router.patch(
  "/:id",
  validateParams(SapDocumentIdParamsSchema),
  validateBody(UpdatePurchaseOrderInputSchema),
  purchaseOrderController.updatePurchaseOrder,
);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  validateParams(SapDocumentNumberParamsSchema),
  createExportHandler(getPurchaseOrderByDocNum, "Purchase Order"),
);

// POST /:id/cancel: Triggers a cancellation request for the document in SAP.
router.post(
  "/:id/cancel",
  validateParams(SapDocumentIdParamsSchema),
  purchaseOrderController.cancelPurchaseOrder,
);

export const purchaseOrderRoutes = router;
