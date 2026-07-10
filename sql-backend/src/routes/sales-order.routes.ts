import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { salesOrderDal } from "@/dal/sales-order.dal";
import { quickLookupDal } from "@/dal/quick-lookup.dal";
import { createExportHandler } from "@/dal/export.dal";
import { salesOrderService } from "@/services/sales-order.service";
const router = Router();
router.use(validateSession);
router.get("/", salesOrderDal.getList);
router.get("/docnums", loginLimiter, salesOrderDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await salesOrderService.previewNextDocNum(), success: true });
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
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "Sales Order"),
);
export const salesOrderRoutes = router;
