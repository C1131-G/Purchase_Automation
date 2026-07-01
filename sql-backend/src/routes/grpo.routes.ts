import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { grpoDal } from "@/dal/grpo.dal";
import { quickLookupDal } from "@/dal/quick-lookup.dal";
import { createExportHandler } from "@/dal/export.dal";
import { grpoService } from "@/services/grpo.service";
const router = Router();
router.use(validateSession);
router.get("/", grpoDal.getList);
router.get("/docnums", loginLimiter, grpoDal.getDocNums);
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
    return { doc: r, lines: r.lines ?? [], attachments: [] };
  }, "GRPO"),
);
export const grpoRoutes = router;
