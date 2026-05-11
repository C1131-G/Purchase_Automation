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
import { AccountQuerySchema } from "@/validation/schemas/inputs/outgoing-payment-account.input";

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

// GET /accounts: Retrieves DSC1 accounts for the account selection dropdown.
router.get("/accounts", validateQuery(AccountQuerySchema), outgoingPaymentDal.getAccounts);

// GET /:id: Fetches full details for a single outgoing payment.
router.get("/:id", outgoingPaymentDal.getPayment);

// GET /by-doc-num/:docNum: Fetches full details for a single outgoing payment using its DocNum.
router.get("/by-doc-num/:docNum", outgoingPaymentDal.getPaymentByDocNum);

// POST /: Entry point for recording a payment made to a vendor.
router.post("/", outgoingPaymentDal.createPayment);

// PATCH /:id: Updates metadata (remarks) for an existing payment record.
router.patch("/:id", outgoingPaymentDal.updatePayment);

// POST /:id/cancel: Triggers a cancellation for the payment in SAP.
router.post("/:id/cancel", outgoingPaymentDal.cancelPayment);

// POST /backfill: Backfills U_Mode_Pay for legacy payments.
router.post("/backfill", async (req, res, next) => {
  try {
    const { serviceLayerClient } = await import("@/services/service-layer.service");
    const { outgoingPaymentService } = await import("@/services/outgoing-payment.service");

    const session = serviceLayerClient.getSession(req.sessionID);
    if (!session?.companyDB) {
      res.status(401).json({ error: "No active session", success: false });
      return;
    }

    const result = await outgoingPaymentService.backfillPaymentModes(req.sessionID, 50);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const outgoingPaymentRoutes = router;
