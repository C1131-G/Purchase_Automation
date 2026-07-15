import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";

import { purchaseOrderDal } from "./purchase-order.controller";
import { purchaseOrderService } from "./purchase-order.service";

const router = Router();

router.use(validateSession);

router.get("/docnums", purchaseOrderDal.getDocNums);
router.get("/next-docnum", purchaseOrderDal.previewNextDocNum);
router.get("/by-doc-num/:docNum", purchaseOrderDal.getByDocNum);
router.get("/:id", purchaseOrderDal.getById);
router.get("/", purchaseOrderDal.getList);
router.post("/", purchaseOrderDal.create);
router.patch("/:id", purchaseOrderDal.update);
router.post("/:id/cancel", purchaseOrderDal.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const result = await purchaseOrderService.getByDocNum(docNum);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "Purchase Order"),
);

export const purchaseOrderRoutes = router;
