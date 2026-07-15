import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/export.handler";
import { quickLookupDal } from "@/shared/route-handlers/quick-lookup.handler";

import { outgoingPaymentDal } from "./outgoing-payment.controller";
import { outgoingPaymentService } from "./outgoing-payment.service";

const router = Router();
router.use(validateSession);

router.get("/", outgoingPaymentDal.getList);
router.get("/docnums", loginLimiter, outgoingPaymentDal.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await outgoingPaymentService.previewNextDocNum(),
    success: true,
  });
});
router.get("/by-doc-num/:docNum", outgoingPaymentDal.getByDocNum);
router.get("/accounts", quickLookupDal.getAccounts);
router.get("/:id", outgoingPaymentDal.getById);
router.post("/", outgoingPaymentDal.create);
router.patch("/:id", outgoingPaymentDal.update);
router.post("/:id/cancel", outgoingPaymentDal.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const r = await outgoingPaymentService.getByDocNum(docNum);
    return { attachments: [], doc: r, lines: [] };
  }, "Outgoing Payment"),
);

export const outgoingPaymentRoutes = router;
