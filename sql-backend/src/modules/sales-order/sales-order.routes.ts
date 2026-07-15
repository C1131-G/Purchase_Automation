import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { quickLookupController } from "@/shared/route-handlers/quick-lookup.handler";

import { salesOrderController } from "./sales-order.controller";
import { salesOrderService } from "./sales-order.service";

const router = Router();
router.use(validateSession);

router.get("/", salesOrderController.getList);
router.get("/docnums", loginLimiter, salesOrderController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await salesOrderService.previewNextDocNum(),
    success: true,
  });
});
router.get("/open-lines", quickLookupController.getOpenSalesOrderLines);
router.get("/SalesEmployee", quickLookupController.getSalesEmployee);
router.get("/by-doc-num/:docNum", salesOrderController.getByDocNum);
router.get("/:id", salesOrderController.getById);
router.post("/", salesOrderController.create);
router.patch("/:id", salesOrderController.update);
router.post("/:id/cancel", salesOrderController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await salesOrderService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "Sales Order"),
);

export const salesOrderRoutes = router;
