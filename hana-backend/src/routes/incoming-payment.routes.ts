// Incoming Payment Routes: Endpoints for tracking payments received from customers.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { incomingPaymentDal } from "@/dal/incoming-payment.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  PaymentDocNumLookupQuerySchema,
  PaymentQuerySchema,
} from "@/validation/schemas/inputs/payments.input";
import { IncomingAccountQuerySchema } from "@/validation/schemas/inputs/incoming-payment-account.input";

const router = express.Router();

// Security: All incoming payment operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of payments received from the tenant's customers.
router.get("/", validateQuery(PaymentQuerySchema), incomingPaymentDal.getPayments);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PaymentDocNumLookupQuerySchema),
  incomingPaymentDal.getPaymentDocNums,
);

// GET /by-doc-num/:docNum: Fetches full details for a single incoming payment using its DocNum.
router.get("/by-doc-num/:docNum", incomingPaymentDal.getPaymentByDocNum);

// GET /accounts: Retrieves OACT cash accounts for the incoming payment account selection.
router.get("/accounts", validateQuery(IncomingAccountQuerySchema), incomingPaymentDal.getAccounts);

// GET /:id: Fetches full details for a single incoming payment, including settlement allocations.
router.get("/:id", incomingPaymentDal.getPayment);

// POST /: Entry point for recording a new payment received.
router.post("/", incomingPaymentDal.createPayment);

// PATCH /:id: Updates non-financial metadata of a payment record.
router.patch("/:id", incomingPaymentDal.updatePayment);

// POST /:id/cancel: Triggers a cancellation for the payment in SAP.
router.post("/:id/cancel", incomingPaymentDal.cancelPayment);

export const incomingPaymentRoutes = router;
