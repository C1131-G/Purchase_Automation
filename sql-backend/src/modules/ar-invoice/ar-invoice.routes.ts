import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";

import { arInvoiceDal } from "./ar-invoice.controller";
import { arInvoiceService } from "./ar-invoice.service";

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
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "AR Invoice"),
);

export const arInvoiceRoutes = router;
