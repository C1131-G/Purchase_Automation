import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { quickLookupController } from "@/shared/route-handlers/quick-lookup.handler";

import { purchaseQuotationController } from "./purchase-quotation.controller";
import { purchaseQuotationService } from "./purchase-quotation.service";

const router = Router();
router.use(validateSession);

router.get("/", purchaseQuotationController.getList);
router.get("/docnums", loginLimiter, purchaseQuotationController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await purchaseQuotationService.previewNextDocNum(),
    success: true,
  });
});
router.get("/open-lines", quickLookupController.getOpenLines);
router.get("/SalesEmployee", quickLookupController.getSalesEmployee);
router.get("/by-doc-num/:docNum", purchaseQuotationController.getByDocNum);
router.get("/:id", purchaseQuotationController.getById);
router.post("/", purchaseQuotationController.create);
router.patch("/:id", purchaseQuotationController.update);
router.post("/:id/cancel", purchaseQuotationController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await purchaseQuotationService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "Purchase Quotation"),
);

export const purchaseQuotationRoutes = router;
