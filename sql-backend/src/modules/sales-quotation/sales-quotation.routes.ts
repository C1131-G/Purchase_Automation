import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { quickLookupController } from "@/shared/route-handlers/quick-lookup.handler";

import { salesQuotationController } from "./sales-quotation.controller";
import { salesQuotationService } from "./sales-quotation.service";

const router = Router();
router.use(validateSession);

router.get("/", salesQuotationController.getList);
router.get("/docnums", loginLimiter, salesQuotationController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await salesQuotationService.previewNextDocNum(),
    success: true,
  });
});
router.get("/open-lines", quickLookupController.getOpenSalesQuotationLines);
router.get("/SalesEmployee", quickLookupController.getSalesEmployee);
router.get("/by-doc-num/:docNum", salesQuotationController.getByDocNum);
router.get("/:id", salesQuotationController.getById);
router.post("/", salesQuotationController.create);
router.patch("/:id", salesQuotationController.update);
router.post("/:id/cancel", salesQuotationController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await salesQuotationService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "Sales Quotation"),
);

export const salesQuotationRoutes = router;
