import express from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { validateBody, validateParams } from "@/core/middleware/validation.middleware";

import {
  convertRfq,
  confirmArInvoice,
  getIcHealth,
  getIcRevision,
  getRfq,
  listNotifications,
  listRetries,
  listRfqs,
  markAllNotificationsRead,
  markNotificationRead,
  runRetry,
  submitRfq,
  unreadNotificationCount,
  updateRfq,
} from "./ic.controller";
import {
  ConfirmArInvoiceBodySchema,
  PoDocEntryParamsSchema,
  RfqIdParamsSchema,
  SubmitRfqBodySchema,
  UpdateRfqBodySchema,
} from "./ic.schema";

const router = express.Router();

router.get("/health", getIcHealth);
router.use(validateSession);
router.get("/revision", getIcRevision);

router.get("/rfqs", listRfqs);
router.get("/rfqs/:id", validateParams(RfqIdParamsSchema), getRfq);
router.put(
  "/rfqs/:id",
  validateParams(RfqIdParamsSchema, { feature: "intercompany.rfq", operation: "update" }),
  validateBody(UpdateRfqBodySchema, { feature: "intercompany.rfq", operation: "update" }),
  updateRfq,
);
router.post(
  "/rfqs/:id/submit",
  validateParams(RfqIdParamsSchema, { feature: "intercompany.rfq", operation: "submit" }),
  validateBody(SubmitRfqBodySchema, { feature: "intercompany.rfq", operation: "submit" }),
  submitRfq,
);
router.post("/rfqs/:id/convert", validateParams(RfqIdParamsSchema), convertRfq);
router.post(
  "/pos/:poDocEntry/confirm-ar",
  validateParams(PoDocEntryParamsSchema, { feature: "intercompany.po", operation: "confirm-ar" }),
  validateBody(ConfirmArInvoiceBodySchema, { feature: "intercompany.po", operation: "confirm-ar" }),
  confirmArInvoice,
);

router.get("/notifications", listNotifications);
router.get("/notifications/unread-count", unreadNotificationCount);
router.post("/notifications/mark-all-read", markAllNotificationsRead);
router.patch("/notifications/:id/read", validateParams(RfqIdParamsSchema), markNotificationRead);

router.get("/retries", listRetries);
router.post("/retries/:id/run", validateParams(RfqIdParamsSchema), runRetry);

export const icRoutes = router;
