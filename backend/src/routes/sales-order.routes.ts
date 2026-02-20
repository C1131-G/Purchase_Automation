// Sales Order Routes: Endpoints for customers to view and manage their purchase orders (Sales Orders from the system's perspective).

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { salesOrderDal } from "@/dal/sales-order.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  SalesOrderDocNumLookupQuerySchema,
  SalesOrderQuerySchema,
} from "@/validation/schemas/inputs/sales-order.input";

const router = express.Router();

// Security: All sales order operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of sales orders with tenant-specific filtering.
router.get("/", validateQuery(SalesOrderQuerySchema), salesOrderDal.getSalesOrders);
router.get(
  "/docnums",
  validateQuery(SalesOrderDocNumLookupQuerySchema),
  salesOrderDal.getSalesOrderDocNums,
);

// GET /SalesEmployee: Lookup for finding which sales personnel are assigned to the current tenant.
router.get("/SalesEmployee", salesOrderDal.getSalesEmployees);

// GET /:id: Fetches full details for a single sales order.
router.get("/:id", salesOrderDal.getSalesOrder);

// POST /: Submits a new sales order into the SAP system.
router.post("/", salesOrderDal.createSalesOrder);

// PATCH /:id: Modifies an existing open sales order.
router.patch("/:id", salesOrderDal.updateSalesOrder);

// POST /:id/cancel: Marks a sales order as canceled in the backend.
router.post("/:id/cancel", salesOrderDal.cancelSalesOrder);

export const salesOrderRoutes = router;
