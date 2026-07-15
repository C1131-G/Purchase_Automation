import express from "express";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { goodsIssueController } from "./goods-issue.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { GoodsIssueDocNumLookupQuerySchema, GoodsIssueQuerySchema } from "./goods-issue.schema";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(GoodsIssueQuerySchema), goodsIssueController.getGoodsIssues);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(GoodsIssueDocNumLookupQuerySchema),
  goodsIssueController.getGoodsIssueDocNums,
);
router.post("/", goodsIssueController.createGoodsIssue);
router.get("/:id", goodsIssueController.getGoodsIssue);
router.patch("/:id", goodsIssueController.updateGoodsIssue);

export const goodsIssueRoutes = router;
