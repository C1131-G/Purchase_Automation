import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";

import { goodsIssueController } from "./goods-issue.controller";
import { goodsIssueService } from "./goods-issue.service";

const router = Router();
router.use(validateSession);

router.get("/", goodsIssueController.getList);
router.get("/docnums", loginLimiter, goodsIssueController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await goodsIssueService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", goodsIssueController.getById);
router.post("/", goodsIssueController.create);
router.patch("/:id", goodsIssueController.update);

export const goodsIssueRoutes = router;
