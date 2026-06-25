import express from "express";
import { validateSession } from "@/core/middleware/session.middleware";
import { goodsReceiptDal } from "@/dal/goods-receipt.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  GoodsReceiptQuerySchema,
  GoodsReceiptDocNumLookupQuerySchema,
} from "@/validation/schemas/inputs/goods-receipt.input";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(GoodsReceiptQuerySchema), goodsReceiptDal.getGoodsReceipts);
router.get(
  "/docnums",
  validateQuery(GoodsReceiptDocNumLookupQuerySchema),
  goodsReceiptDal.getGoodsReceiptDocNums,
);
router.get("/:id", goodsReceiptDal.getGoodsReceipt);
router.post("/", goodsReceiptDal.createGoodsReceipt);

export const goodsReceiptRoutes = router;
