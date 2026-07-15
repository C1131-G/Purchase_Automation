import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";

import { apInvoiceController } from "./ap-invoice.controller";
import { apInvoiceService } from "./ap-invoice.service";

const router = Router();
router.use(validateSession);

router.get("/", apInvoiceController.getList);
router.get("/docnums", loginLimiter, apInvoiceController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await apInvoiceService.previewNextDocNum(), success: true });
});
router.get("/:id", apInvoiceController.getById);
router.post("/", apInvoiceController.create);
router.patch("/:id", apInvoiceController.update);
router.post("/:id/cancel", apInvoiceController.cancel);
router.post("/:id/reopen", apInvoiceController.reopen);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await apInvoiceService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "AP Invoice"),
);

export const apInvoiceRoutes = router;
