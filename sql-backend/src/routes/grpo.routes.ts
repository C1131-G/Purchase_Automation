import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { grpoService } from "@/services/grpo.service";

const router = express.Router();

router.use(validateSession);

const getDbName = (req: express.Request) =>
  (req as express.Request & { user: { dbName: string } }).user?.dbName || "";

router.get("/", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await grpoService.getGRPOs(dbName, {
      limit,
      page,
      search,
      status,
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get("/docnums", lookupLimiter, async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const search = req.query.search as string;
    const limit = Number.parseInt(req.query.limit as string) || 10;
    const result = await grpoService.getGRPODocNums(dbName, search, limit);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get("/available-pos", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const search = req.query.search as string;
    const limit = Number.parseInt(req.query.limit as string) || 10;
    const result = await grpoService.getAvailablePOs(dbName, search, limit);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get("/po-detail/:id", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const { id } = req.params;
    const data = await grpoService.getGRPO(dbName, id);
    if (!data) {
      return res.status(404).json({ message: "PO not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const { id } = req.params;
    const data = await grpoService.getGRPO(dbName, id);
    if (!data) {
      return res.status(404).json({ message: "GRPO not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    res.status(201).json({ data: req.body, message: "GRPO created (stub)", success: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    res.status(200).json({ message: "GRPO updated (stub)", success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/cancel", async (req, res, next) => {
  try {
    res.status(200).json({ message: "GRPO cancelled (stub)", success: true });
  } catch (error) {
    next(error);
  }
});

export const grpoRoutes = router;
