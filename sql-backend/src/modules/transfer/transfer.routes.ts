import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";

import { transferController } from "./transfer.controller";
import { inventoryTransferService } from "./transfer.service";

const router = Router();
router.use(validateSession);

router.get("/", transferController.getList);
router.get("/docnums", loginLimiter, transferController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await inventoryTransferService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", transferController.getTransfer);
router.post("/", transferController.create);

router.get(
  "/:id/export/:format",
  createExportHandler(async (id) => {
    const result = await inventoryTransferService.getByDocNum(id);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "Transfer"),
);

export const transferRoutes = router;
