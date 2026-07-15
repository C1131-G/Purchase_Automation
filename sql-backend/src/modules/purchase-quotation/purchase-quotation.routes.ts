import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";
import { quickLookupDal } from "@/shared/route-handlers/quick-lookup.handler";

import { purchaseQuotationDal } from "./purchase-quotation.controller";
import { purchaseQuotationService } from "./purchase-quotation.service";

const router = Router();
router.use(validateSession);

router.get("/", purchaseQuotationDal.getList);
router.get("/docnums", loginLimiter, purchaseQuotationDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await purchaseQuotationService.previewNextDocNum(),
    success: true,
  });
});
router.get("/open-lines", quickLookupDal.getOpenLines);
router.get("/SalesEmployee", quickLookupDal.getSalesEmployee);
router.get("/by-doc-num/:docNum", purchaseQuotationDal.getByDocNum);
router.get("/:id", purchaseQuotationDal.getById);
router.post("/", purchaseQuotationDal.create);
router.patch("/:id", purchaseQuotationDal.update);
router.post("/:id/cancel", purchaseQuotationDal.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await purchaseQuotationService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "Purchase Quotation"),
);

export const purchaseQuotationRoutes = router;
