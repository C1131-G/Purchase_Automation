import express from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import {
  convertRfq,
  confirmArInvoice,
  getIcHealth,
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

const router = express.Router();

router.get("/health", getIcHealth);
router.use(validateSession);

router.get("/rfqs", listRfqs);
router.get("/rfqs/:id", getRfq);
router.put("/rfqs/:id", updateRfq);
router.post("/rfqs/:id/submit", submitRfq);
router.post("/rfqs/:id/convert", convertRfq);
router.post("/pos/:poDocEntry/confirm-ar", confirmArInvoice);

router.get("/notifications", listNotifications);
router.get("/notifications/unread-count", unreadNotificationCount);
router.post("/notifications/mark-all-read", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

router.get("/retries", listRetries);
router.post("/retries/:id/run", runRetry);

export const icRoutes = router;
