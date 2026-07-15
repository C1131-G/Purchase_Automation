import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";

import { purchaseOrderController } from "./purchase-order.controller";
import { purchaseOrderService } from "./purchase-order.service";

const router = Router();

router.use(validateSession);

router.get("/docnums", purchaseOrderController.getDocNums);
router.get("/next-docnum", purchaseOrderController.previewNextDocNum);
router.get("/by-doc-num/:docNum", purchaseOrderController.getByDocNum);
router.get("/:id", purchaseOrderController.getById);
router.get("/", purchaseOrderController.getList);
router.post("/", purchaseOrderController.create);
router.patch("/:id", purchaseOrderController.update);
router.post("/:id/cancel", purchaseOrderController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const result = await purchaseOrderService.getByDocNum(docNum);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "Purchase Order"),
);

export const purchaseOrderRoutes = router;
