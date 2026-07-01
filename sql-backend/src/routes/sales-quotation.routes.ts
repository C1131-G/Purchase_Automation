import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { salesQuotationDal } from "@/dal/sales-quotation.dal";
import { quickLookupDal } from "@/dal/quick-lookup.dal";
import { createExportHandler } from "@/dal/export.dal";
import { salesQuotationService } from "@/services/sales-quotation.service";
const router = Router();
router.use(validateSession);
router.get("/", salesQuotationDal.getList);
router.get("/docnums", loginLimiter, salesQuotationDal.getDocNums);
router.get("/open-lines", quickLookupDal.getOpenLines);
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
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "Sales Quotation"),
);
export const salesQuotationRoutes = router;
