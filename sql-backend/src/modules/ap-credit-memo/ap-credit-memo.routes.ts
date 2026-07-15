import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";

import { apCreditMemoController } from "./ap-credit-memo.controller";
import { apCreditMemoService } from "./ap-credit-memo.service";

const router = Router();
router.use(validateSession);

router.get("/", apCreditMemoController.getList);
router.get("/docnums", loginLimiter, apCreditMemoController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await apCreditMemoService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", apCreditMemoController.getById);
router.post("/", apCreditMemoController.create);
router.patch("/:id", apCreditMemoController.update);
router.post("/:id/cancel", apCreditMemoController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const result = await apCreditMemoService.getByDocNum(docNum);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "AP Credit Memo"),
);

export const apCreditMemoRoutes = router;
