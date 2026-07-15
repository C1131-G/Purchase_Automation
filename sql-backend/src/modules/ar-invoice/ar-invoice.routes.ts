import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";

import { arInvoiceController } from "./ar-invoice.controller";
import { arInvoiceService } from "./ar-invoice.service";

const router = Router();
router.use(validateSession);

router.get("/", arInvoiceController.getList);
router.get("/docnums", loginLimiter, arInvoiceController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await arInvoiceService.previewNextDocNum(), success: true });
});
router.get("/:id", arInvoiceController.getById);
router.post("/", arInvoiceController.create);
router.patch("/:id", arInvoiceController.update);
router.post("/:id/cancel", arInvoiceController.cancel);
router.post("/:id/reopen", arInvoiceController.reopen);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await arInvoiceService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "AR Invoice"),
);

export const arInvoiceRoutes = router;
