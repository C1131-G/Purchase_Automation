import express from "express";

import {
  convertRfq,
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

router.get("/rfqs", listRfqs);
router.get("/rfqs/:id", getRfq);
router.put("/rfqs/:id", updateRfq);
router.post("/rfqs/:id/submit", submitRfq);
router.post("/rfqs/:id/convert", convertRfq);

router.get("/notifications", listNotifications);
router.get("/notifications/unread-count", unreadNotificationCount);
router.post("/notifications/mark-all-read", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

router.get("/retries", listRetries);
router.post("/retries/:id/run", runRetry);

export const icRoutes = router;
