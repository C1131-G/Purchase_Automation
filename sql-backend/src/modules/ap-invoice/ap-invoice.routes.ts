import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";

import { apInvoiceDal } from "./ap-invoice.controller";
import { apInvoiceService } from "./ap-invoice.service";

const router = Router();
router.use(validateSession);

router.get("/", apInvoiceDal.getList);
router.get("/docnums", loginLimiter, apInvoiceDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await apInvoiceService.previewNextDocNum(), success: true });
});
router.get("/:id", apInvoiceDal.getById);
router.post("/", apInvoiceDal.create);
router.patch("/:id", apInvoiceDal.update);
router.post("/:id/cancel", apInvoiceDal.cancel);
router.post("/:id/reopen", apInvoiceDal.reopen);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await apInvoiceService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "AP Invoice"),
);

export const apInvoiceRoutes = router;
