// Purchase Order Routes: Endpoints for vendors to interact with procurement documents.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { purchaseOrderDal } from "@/dal/purchase-order.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  PurchaseOrderDocNumLookupQuerySchema,
  PurchaseOrderQuerySchema,
} from "@/validation/schemas/inputs/purchase-order.input";

const router = express.Router();

// Security: All purchase order operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of POs, optionally filtered by date or document number.
router.get("/", validateQuery(PurchaseOrderQuerySchema), purchaseOrderDal.getPurchaseOrders);

// GET /docnums: Retrieves distinct DocNum values for lookup suggestions.
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PurchaseOrderDocNumLookupQuerySchema),
  purchaseOrderDal.getPurchaseOrderDocNums,
);

// GET /:id: Fetches full details for a single PO, including line items.
router.get("/by-doc-num/:docNum", purchaseOrderDal.getPurchaseOrderByDocNum);

// GET /:id: Fetches full details for a single PO, including line items.
router.get("/:id", purchaseOrderDal.getPurchaseOrder);

// POST /: Entry point for creating a new PO.
router.post("/", purchaseOrderDal.createPurchaseOrder);

// PATCH /:id: Updates an existing draft or open PO.
router.patch("/:id", purchaseOrderDal.updatePurchaseOrder);

// POST /:id/cancel: Triggers a cancellation request for the document in SAP.
router.post("/:id/cancel", purchaseOrderDal.cancelPurchaseOrder);

export const purchaseOrderRoutes = router;
