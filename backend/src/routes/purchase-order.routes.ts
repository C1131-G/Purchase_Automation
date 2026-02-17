// Purchase Order Routes: Endpoints for vendors to interact with procurement documents.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { purchaseOrderDal } from "@/dal/purchase-order.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { PurchaseOrderQuerySchema } from "@/validation/schemas/inputs/purchase-order.input";

const router = express.Router();

// Security: All purchase order operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of POs, optionally filtered by date or document number.
router.get("/", validateQuery(PurchaseOrderQuerySchema), purchaseOrderDal.getPurchaseOrders);

// GET /:id: Fetches full details for a single PO, including line items.
router.get("/:id", purchaseOrderDal.getPurchaseOrder);

// POST /: Entry point for creating a new PO.
router.post("/", purchaseOrderDal.createPurchaseOrder);

// PATCH /:id: Updates an existing draft or open PO.
router.patch("/:id", purchaseOrderDal.updatePurchaseOrder);

// POST /:id/cancel: Triggers a cancellation request for the document in SAP.
router.post("/:id/cancel", purchaseOrderDal.cancelPurchaseOrder);

export const purchaseOrderRoutes = router;
