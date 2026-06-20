import express from "express";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { goodsIssueDal } from "@/dal/goods-issue.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  GoodsIssueDocNumLookupQuerySchema,
  GoodsIssueQuerySchema,
} from "@/validation/schemas/inputs/goods-issue.input";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(GoodsIssueQuerySchema), goodsIssueDal.getGoodsIssues);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(GoodsIssueDocNumLookupQuerySchema),
  goodsIssueDal.getGoodsIssueDocNums,
);
router.get("/:id", goodsIssueDal.getGoodsIssue);

export const goodsIssueRoutes = router;
