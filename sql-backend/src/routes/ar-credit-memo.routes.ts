import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { arCreditMemoDal } from "@/dal/ar-credit-memo.dal";
import { createExportHandler } from "@/dal/export.dal";
import { arCreditMemoService } from "@/services/ar-credit-memo.service";
const router = Router();
router.use(validateSession);
router.get("/", arCreditMemoDal.getList);
router.get("/docnums", loginLimiter, arCreditMemoDal.getDocNums);
router.get("/:id", arCreditMemoDal.getById);
router.post("/", arCreditMemoDal.create);
router.patch("/:id", arCreditMemoDal.update);
router.post("/:id/cancel", arCreditMemoDal.cancel);
router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await arCreditMemoService.getByDocNum(docNum);
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "AR Credit Memo"),
);
export const arCreditMemoRoutes = router;
