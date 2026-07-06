import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { arInvoiceDal } from "@/dal/ar-invoice.dal";
import { createExportHandler } from "@/dal/export.dal";
import { arInvoiceService } from "@/services/ar-invoice.service";
const router = Router();
router.use(validateSession);
router.get("/", arInvoiceDal.getList);
router.get("/docnums", loginLimiter, arInvoiceDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await arInvoiceService.previewNextDocNum(), success: true });
});
router.get("/:id", arInvoiceDal.getById);
router.post("/", arInvoiceDal.create);
router.patch("/:id", arInvoiceDal.update);
router.post("/:id/cancel", arInvoiceDal.cancel);
router.post("/:id/reopen", arInvoiceDal.reopen);
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await arInvoiceService.getByDocNum(docNum);
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "AR Invoice"),
);
export const arInvoiceRoutes = router;
