import express from "express";

import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { purchaseOrderService } from "@/services/purchase-order.service";

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

    const result = await purchaseOrderService.getPurchaseOrders(dbName, {
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

    const result = await purchaseOrderService.getPurchaseOrderDocNums(dbName, search, limit);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const dbName = getDbName(req);
    const { id } = req.params;

    const data = await purchaseOrderService.getPurchaseOrder(dbName, id);

    if (!data) {
      return res.status(404).json({ message: "Purchase Order not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
});

export const purchaseOrderRoutes = router;
