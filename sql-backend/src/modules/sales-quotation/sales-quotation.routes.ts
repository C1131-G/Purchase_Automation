import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";
import { quickLookupDal } from "@/shared/route-handlers/quick-lookup.handler";

import { salesQuotationDal } from "./sales-quotation.controller";
import { salesQuotationService } from "./sales-quotation.service";

const router = Router();
router.use(validateSession);

router.get("/", salesQuotationDal.getList);
router.get("/docnums", loginLimiter, salesQuotationDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await salesQuotationService.previewNextDocNum(),
    success: true,
  });
});
router.get("/open-lines", quickLookupDal.getOpenSalesQuotationLines);
router.get("/SalesEmployee", quickLookupDal.getSalesEmployee);
router.get("/by-doc-num/:docNum", salesQuotationDal.getByDocNum);
router.get("/:id", salesQuotationDal.getById);
router.post("/", salesQuotationDal.create);
router.patch("/:id", salesQuotationDal.update);
router.post("/:id/cancel", salesQuotationDal.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await salesQuotationService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "Sales Quotation"),
);

export const salesQuotationRoutes = router;
