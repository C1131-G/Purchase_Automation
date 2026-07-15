import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { quickLookupController } from "@/shared/route-handlers/quick-lookup.handler";

import { grpoController } from "./grpo.controller";
import { grpoService } from "./grpo.service";

const router = Router();
router.use(validateSession);

router.get("/", grpoController.getList);
router.get("/docnums", loginLimiter, grpoController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await grpoService.previewNextDocNum(), success: true });
});
router.get("/available-pos", quickLookupController.getAvailablePos);
router.get("/po-detail/:id", quickLookupController.getPoDetail);
router.get("/:id", grpoController.getById);
router.post("/", grpoController.create);
router.patch("/:id", grpoController.update);
router.post("/:id/cancel", grpoController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await grpoService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "GRPO"),
);

export const grpoRoutes = router;
