import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";

import { transferRequestController } from "./transfer-request.controller";
import { inventoryTransferRequestService } from "./transfer-request.service";

const router = Router();
router.use(validateSession);

router.get("/", transferRequestController.getList);
router.get("/docnums", loginLimiter, transferRequestController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await inventoryTransferRequestService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", transferRequestController.getTransferRequest);
router.post("/", transferRequestController.create);

router.get(
  "/:id/export/:format",
  createExportHandler(async (id) => {
    const result = await inventoryTransferRequestService.getByDocNum(id);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "Transfer Request"),
);

export const transferRequestRoutes = router;
