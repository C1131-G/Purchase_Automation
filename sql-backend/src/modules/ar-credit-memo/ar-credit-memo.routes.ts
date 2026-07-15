import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";

import { arCreditMemoController } from "./ar-credit-memo.controller";
import { arCreditMemoService } from "./ar-credit-memo.service";

const router = Router();
router.use(validateSession);

router.get("/", arCreditMemoController.getList);
router.get("/docnums", loginLimiter, arCreditMemoController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await arCreditMemoService.previewNextDocNum(),
    success: true,
  });
});
router.get("/:id", arCreditMemoController.getById);
router.post("/", arCreditMemoController.create);
router.patch("/:id", arCreditMemoController.update);
router.post("/:id/cancel", arCreditMemoController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const result = await arCreditMemoService.getByDocNum(docNum);
    return { attachments: [], doc: result, lines: result.lines ?? [] };
  }, "AR Credit Memo"),
);

export const arCreditMemoRoutes = router;
