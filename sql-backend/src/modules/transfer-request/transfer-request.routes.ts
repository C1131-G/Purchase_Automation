import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";

import { transferRequestDal } from "./transfer-request.controller";
import { inventoryTransferRequestService } from "./transfer-request.service";

const router = Router();
router.use(validateSession);

router.get("/", transferRequestDal.getList);
router.get("/docnums", loginLimiter, transferRequestDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await inventoryTransferRequestService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", transferRequestDal.getTransferRequest);
router.post("/", transferRequestDal.create);

router.get(
  "/:id/export/:format",
  createExportHandler(async (id) => {
    const result = await inventoryTransferRequestService.getByDocNum(id);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "Transfer Request"),
);

export const transferRequestRoutes = router;
