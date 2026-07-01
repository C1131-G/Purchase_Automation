// Transfer Routes: Mirrors hana-backend/src/routes/transfer.routes.ts

import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { transferDal } from "@/dal/transfer.dal";
import { createExportHandler } from "@/dal/export.dal";
import { inventoryTransferService } from "@/services/inventory-transfer.service";

const router = Router();
router.use(validateSession);

router.get("/", transferDal.getList);
router.get("/docnums", loginLimiter, transferDal.getDocNums);
router.get("/:id", transferDal.getTransfer);
router.post("/", transferDal.create);

router.get(
  "/:id/export/:format",
  createExportHandler(async (id) => {
    const result = await inventoryTransferService.getByDocNum(id);
    return { doc: result, lines: result.DocumentLines ?? [], attachments: [] };
  }, "Transfer"),
);

export const transferRoutes = router;
