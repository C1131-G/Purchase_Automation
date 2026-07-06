import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { goodsReceiptDal } from "@/dal/goods-receipt.dal";
import { goodsReceiptService } from "@/services/goods-receipt.service";
const router = Router();
router.use(validateSession);
router.get("/", goodsReceiptDal.getList);
router.get("/docnums", loginLimiter, goodsReceiptDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await goodsReceiptService.previewNextDocNum(), success: true });
});
router.get("/:id", goodsReceiptDal.getById);
router.post("/", goodsReceiptDal.create);
router.patch("/:id", goodsReceiptDal.update);
export const goodsReceiptRoutes = router;
