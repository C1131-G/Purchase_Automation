import express from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { goodsReceiptController } from "./goods-receipt.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import {
  GoodsReceiptQuerySchema,
  GoodsReceiptDocNumLookupQuerySchema,
} from "./goods-receipt.schema";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(GoodsReceiptQuerySchema), goodsReceiptController.getGoodsReceipts);
router.get(
  "/docnums",
  validateQuery(GoodsReceiptDocNumLookupQuerySchema),
  goodsReceiptController.getGoodsReceiptDocNums,
);
router.get("/:id", goodsReceiptController.getGoodsReceipt);
router.post("/", goodsReceiptController.createGoodsReceipt);
router.patch("/:id", goodsReceiptController.updateGoodsReceipt);

export const goodsReceiptRoutes = router;
