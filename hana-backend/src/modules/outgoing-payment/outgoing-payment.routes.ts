// Outgoing Payment Routes: Endpoints for vendors to track payments made to their accounts.

import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { outgoingPaymentController } from "./outgoing-payment.controller";
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
  CreatePaymentInputSchema,
  PaymentDocNumLookupQuerySchema,
  PaymentQuerySchema,
  UpdatePaymentInputSchema,
} from "./outgoing-payment.schema";
import { AccountQuerySchema } from "./outgoing-payment.schema";

const router = express.Router();

// Security: All outgoing payment operations require an active, validated session.
router.use(validateSession);

// GET /: Retrieves a paginated list of payments made by the system to the vendor.
router.get("/", validateQuery(PaymentQuerySchema), outgoingPaymentController.getPayments);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(PaymentDocNumLookupQuerySchema),
  outgoingPaymentController.getPaymentDocNums,
);

// GET /accounts: Retrieves DSC1 accounts for the account selection dropdown.
router.get("/accounts", validateQuery(AccountQuerySchema), outgoingPaymentController.getAccounts);

// GET /:id: Fetches full details for a single outgoing payment.
router.get("/:id", validateParams(SapDocumentIdParamsSchema), outgoingPaymentController.getPayment);

// GET /by-doc-num/:docNum: Fetches full details for a single outgoing payment using its DocNum.
router.get(
  "/by-doc-num/:docNum",
  validateParams(SapDocumentNumberParamsSchema),
  outgoingPaymentController.getPaymentByDocNum,
);

// POST /: Entry point for recording a payment made to a vendor.
router.post("/", validateBody(CreatePaymentInputSchema), outgoingPaymentController.createPayment);

// PATCH /:id: Updates metadata (remarks) for an existing payment record.
router.patch(
  "/:id",
  validateParams(SapDocumentIdParamsSchema),
  validateBody(UpdatePaymentInputSchema),
  outgoingPaymentController.updatePayment,
);

// POST /:id/cancel: Triggers a cancellation for the payment in SAP.
router.post(
  "/:id/cancel",
  validateParams(SapDocumentIdParamsSchema),
  outgoingPaymentController.cancelPayment,
);

// POST /backfill: Backfills U_Mode_Pay for legacy payments.
router.post("/backfill", async (req, res, next) => {
  try {
    const { serviceLayerClient } = await import("@/services/service-layer.service");
    const { outgoingPaymentService } = await import("./outgoing-payment.service");

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
