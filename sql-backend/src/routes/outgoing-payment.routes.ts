import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { outgoingPaymentService } from "@/services/outgoing-payment.service";

const router = express.Router();
router.use(validateSession);

const getDbName = (req: express.Request) =>
  (req as express.Request & { user: { dbName: string } }).user?.dbName || "";

router.get("/", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const result = await outgoingPaymentService.getPayments(dbName, {
      limit: Number.parseInt(req.query.limit as string) || 20,
      page: Number.parseInt(req.query.page as string) || 1,
      search: req.query.search as string,
      status: req.query.status as string,
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get("/docnums", lookupLimiter, async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const result = await outgoingPaymentService.getPaymentDocNums(
      dbName,
      req.query.search as string,
      Number.parseInt(req.query.limit as string) || 10,
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get("/by-doc-num/:docNum", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const data = await outgoingPaymentService.getPaymentByDocNum(dbName, req.params.docNum);
    if (!data) {
      return res.status(404).json({ message: "Payment not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const data = await documentService.getDocument(dbName, "OutgoingPayment", req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Payment not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (_req, res, next) => {
  try {
    res.status(201).json({ message: "Payment created (stub)", success: true });
  } catch (error) {
    next(error);
  }
});
router.patch("/:id", async (_req, res, next) => {
  try {
    res.status(200).json({ message: "Payment updated (stub)", success: true });
  } catch (error) {
    next(error);
  }
});
router.post("/:id/cancel", async (_req, res, next) => {
  try {
    res.status(200).json({ message: "Payment cancelled (stub)", success: true });
  } catch (error) {
    next(error);
  }
});
router.post("/backfill", async (_req, res, next) => {
  try {
    res.status(200).json({ message: "Backfill stub", success: true });
  } catch (error) {
    next(error);
  }
});

export const outgoingPaymentRoutes = router;
