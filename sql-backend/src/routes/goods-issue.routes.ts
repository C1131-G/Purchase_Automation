import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { goodsIssueDal } from "@/dal/goods-issue.dal";
import { goodsIssueService } from "@/services/goods-issue.service";
const router = Router();
router.use(validateSession);
router.get("/", goodsIssueDal.getList);
router.get("/docnums", loginLimiter, goodsIssueDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await goodsIssueService.previewNextDocNum(), success: true });
});
router.get("/:id", goodsIssueDal.getById);
router.post("/", goodsIssueDal.create);
export const goodsIssueRoutes = router;
