import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";
import { quickLookupDal } from "@/shared/route-handlers/quick-lookup.handler";

import { salesOrderDal } from "./sales-order.controller";
import { salesOrderService } from "./sales-order.service";

const router = Router();
router.use(validateSession);

router.get("/", salesOrderDal.getList);
router.get("/docnums", loginLimiter, salesOrderDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await salesOrderService.previewNextDocNum(),
    success: true,
  });
});
router.get("/open-lines", quickLookupDal.getOpenSalesOrderLines);
router.get("/SalesEmployee", quickLookupDal.getSalesEmployee);
router.get("/by-doc-num/:docNum", salesOrderDal.getByDocNum);
router.get("/:id", salesOrderDal.getById);
router.post("/", salesOrderDal.create);
router.patch("/:id", salesOrderDal.update);
router.post("/:id/cancel", salesOrderDal.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await salesOrderService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "Sales Order"),
);

export const salesOrderRoutes = router;
