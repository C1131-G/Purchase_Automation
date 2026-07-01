import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { apInvoiceDal } from "@/dal/ap-invoice.dal";
import { createExportHandler } from "@/dal/export.dal";
import { apInvoiceService } from "@/services/ap-invoice.service";
const router = Router();
router.use(validateSession);
router.get("/", apInvoiceDal.getList);
router.get("/docnums", loginLimiter, apInvoiceDal.getDocNums);
router.get("/:id", apInvoiceDal.getById);
router.post("/", apInvoiceDal.create);
router.patch("/:id", apInvoiceDal.update);
router.post("/:id/cancel", apInvoiceDal.cancel);
router.post("/:id/reopen", apInvoiceDal.reopen);
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await apInvoiceService.getByDocNum(docNum);
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "AP Invoice"),
);
export const apInvoiceRoutes = router;
