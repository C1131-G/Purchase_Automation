import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";
import { quickLookupDal } from "@/shared/route-handlers/quick-lookup.handler";

import { grpoDal } from "./grpo.controller";
import { grpoService } from "./grpo.service";

const router = Router();
router.use(validateSession);

router.get("/", grpoDal.getList);
router.get("/docnums", loginLimiter, grpoDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({ data: await grpoService.previewNextDocNum(), success: true });
});
router.get("/available-pos", quickLookupDal.getAvailablePos);
router.get("/po-detail/:id", quickLookupDal.getPoDetail);
router.get("/:id", grpoDal.getById);
router.post("/", grpoDal.create);
router.patch("/:id", grpoDal.update);
router.post("/:id/cancel", grpoDal.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await grpoService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: r.lines ?? [] };
  }, "GRPO"),
);

export const grpoRoutes = router;
