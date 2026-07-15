// Sales Order Routes: Endpoints for customers to view and manage their purchase orders (Sales Orders from the system's perspective).

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { salesOrderController } from "./sales-order.controller";
import { getSalesOrderByDocNum } from "./sales-order.service";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { SalesOrderDocNumLookupQuerySchema, SalesOrderQuerySchema } from "./sales-order.schema";

const router = express.Router();

// Security: All sales order operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of sales orders with tenant-specific filtering.
router.get("/", validateQuery(SalesOrderQuerySchema), salesOrderController.getSalesOrders);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(SalesOrderDocNumLookupQuerySchema),
  salesOrderController.getSalesOrderDocNums,
);
router.get("/open-lines", salesOrderController.getOpenSalesOrderLines);

// GET /SalesEmployee: Lookup for finding which sales personnel are assigned to the current tenant.
router.get("/SalesEmployee", salesOrderController.getSalesEmployees);

// GET /:id: Fetches full details for a single sales order.
router.get("/by-doc-num/:docNum", salesOrderController.getSalesOrderByDocNum);

// GET /:id: Fetches full details for a single sales order.
router.get("/:id", salesOrderController.getSalesOrder);

// POST /: Submits a new sales order into the SAP system.
router.post("/", salesOrderController.createSalesOrder);

// PATCH /:id: Modifies an existing open sales order.
router.patch("/:id", salesOrderController.updateSalesOrder);

// Export endpoints: Download saved document as PDF, Excel, or Word.
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(getSalesOrderByDocNum, "Sales Order"),
);

// POST /:id/cancel: Marks a sales order as canceled in the backend.
router.post("/:id/cancel", salesOrderController.cancelSalesOrder);

export const salesOrderRoutes = router;
