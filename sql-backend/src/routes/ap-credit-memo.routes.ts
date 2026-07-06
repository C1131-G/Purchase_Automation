import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { apCreditMemoDal } from "@/dal/ap-credit-memo.dal";
import { createExportHandler } from "@/dal/export.dal";
import { apCreditMemoService } from "@/services/ap-credit-memo.service";
const router = Router();
router.use(validateSession);
router.get("/", apCreditMemoDal.getList);
router.get("/docnums", loginLimiter, apCreditMemoDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await apCreditMemoService.previewNextDocNum(), success: true });
});
router.get("/:id", apCreditMemoDal.getById);
router.post("/", apCreditMemoDal.create);
router.patch("/:id", apCreditMemoDal.update);
router.post("/:id/cancel", apCreditMemoDal.cancel);
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await apCreditMemoService.getByDocNum(docNum);
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "AP Credit Memo"),
);
export const apCreditMemoRoutes = router;
