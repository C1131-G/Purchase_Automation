import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { purchaseOrderDal } from "@/dal/purchase-order.dal";
import { createExportHandler } from "@/dal/export.dal";
import { purchaseOrderService } from "@/services/purchase-order.service";

const router = Router();

router.use(validateSession);

router.get("/docnums", purchaseOrderDal.getDocNums);
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
    return { doc: result, lines: result.lines ?? [], attachments: [] };
  }, "Purchase Order"),
);

export const purchaseOrderRoutes = router;
