import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";
import { quickLookupDal } from "@/shared/route-handlers/quick-lookup.handler";

import { incomingPaymentDal } from "./incoming-payment.controller";
import { incomingPaymentService } from "./incoming-payment.service";

const router = Router();
router.use(validateSession);

router.get("/", incomingPaymentDal.getList);
router.get("/docnums", loginLimiter, incomingPaymentDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await incomingPaymentService.previewNextDocNum(),
    success: true,
  });
});
router.get("/by-doc-num/:docNum", incomingPaymentDal.getByDocNum);
router.get("/accounts", quickLookupDal.getAccounts);
router.get("/:id", incomingPaymentDal.getById);
router.post("/", incomingPaymentDal.create);
router.patch("/:id", incomingPaymentDal.update);
router.post("/:id/cancel", incomingPaymentDal.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await incomingPaymentService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: [] };
  }, "Incoming Payment"),
);

export const incomingPaymentRoutes = router;
