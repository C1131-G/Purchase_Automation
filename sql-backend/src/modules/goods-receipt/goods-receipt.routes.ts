import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";

import { goodsReceiptController } from "./goods-receipt.controller";
import { goodsReceiptService } from "./goods-receipt.service";

const router = Router();
router.use(validateSession);

router.get("/", goodsReceiptController.getList);
router.get("/docnums", loginLimiter, goodsReceiptController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await goodsReceiptService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", goodsReceiptController.getById);
router.post("/", goodsReceiptController.create);
router.patch("/:id", goodsReceiptController.update);

export const goodsReceiptRoutes = router;
