import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";

import { transferDal } from "./transfer.controller";
import { inventoryTransferService } from "./transfer.service";

const router = Router();
router.use(validateSession);

router.get("/", transferDal.getList);
router.get("/docnums", loginLimiter, transferDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await inventoryTransferService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", transferDal.getTransfer);
router.post("/", transferDal.create);

router.get(
  "/:id/export/:format",
  createExportHandler(async (id) => {
    const result = await inventoryTransferService.getByDocNum(id);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "Transfer"),
);

export const transferRoutes = router;
