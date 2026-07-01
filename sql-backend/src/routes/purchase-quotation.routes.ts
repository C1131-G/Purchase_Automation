import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { purchaseQuotationDal } from "@/dal/purchase-quotation.dal";
import { quickLookupDal } from "@/dal/quick-lookup.dal";
import { createExportHandler } from "@/dal/export.dal";
import { purchaseQuotationService } from "@/services/purchase-quotation.service";
const router = Router();
router.use(validateSession);
router.get("/", purchaseQuotationDal.getList);
router.get("/docnums", loginLimiter, purchaseQuotationDal.getDocNums);
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
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "Purchase Quotation"),
);
export const purchaseQuotationRoutes = router;
