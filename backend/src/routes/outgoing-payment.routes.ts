// Outgoing Payment Routes: Endpoints for vendors to track payments made to their accounts.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { outgoingPaymentDal } from "@/dal/outgoing-payment.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  PaymentDocNumLookupQuerySchema,
  PaymentQuerySchema,
} from "@/validation/schemas/inputs/payments.input";

const router = express.Router();

// Security: All outgoing payment operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of payments made by the system to the vendor.
router.get("/", validateQuery(PaymentQuerySchema), outgoingPaymentDal.getPayments);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PaymentDocNumLookupQuerySchema),
  outgoingPaymentDal.getPaymentDocNums,
);

// GET /:id: Fetches full details for a single outgoing payment.
router.get("/:id", outgoingPaymentDal.getPayment);

// POST /: Entry point for recording a payment made to a vendor.
router.post("/", outgoingPaymentDal.createPayment);

// PATCH /:id: Updates metadata (remarks) for an existing payment record.
router.patch("/:id", outgoingPaymentDal.updatePayment);

// POST /:id/cancel: Triggers a cancellation for the payment in SAP.
router.post("/:id/cancel", outgoingPaymentDal.cancelPayment);

export const outgoingPaymentRoutes = router;
