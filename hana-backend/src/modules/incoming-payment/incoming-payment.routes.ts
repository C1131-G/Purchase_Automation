// Incoming Payment Routes: Endpoints for tracking payments received from customers.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { incomingPaymentController } from "./incoming-payment.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { PaymentDocNumLookupQuerySchema, PaymentQuerySchema } from "./incoming-payment.schema";
import { IncomingAccountQuerySchema } from "./incoming-payment.schema";

const router = express.Router();

// Security: All incoming payment operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of payments received from the tenant's customers.
router.get("/", validateQuery(PaymentQuerySchema), incomingPaymentController.getPayments);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PaymentDocNumLookupQuerySchema),
  incomingPaymentController.getPaymentDocNums,
);

// GET /by-doc-num/:docNum: Fetches full details for a single incoming payment using its DocNum.
router.get("/by-doc-num/:docNum", incomingPaymentController.getPaymentByDocNum);

// GET /accounts: Retrieves OACT cash accounts for the incoming payment account selection.
router.get(
  "/accounts",
  validateQuery(IncomingAccountQuerySchema),
  incomingPaymentController.getAccounts,
);

// GET /:id: Fetches full details for a single incoming payment, including settlement allocations.
router.get("/:id", incomingPaymentController.getPayment);

// POST /: Entry point for recording a new payment received.
router.post("/", incomingPaymentController.createPayment);

// PATCH /:id: Updates non-financial metadata of a payment record.
router.patch("/:id", incomingPaymentController.updatePayment);

// POST /:id/cancel: Triggers a cancellation for the payment in SAP.
router.post("/:id/cancel", incomingPaymentController.cancelPayment);

export const incomingPaymentRoutes = router;
