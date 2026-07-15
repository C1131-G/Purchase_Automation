import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { quickLookupController } from "@/shared/route-handlers/quick-lookup.handler";

import { outgoingPaymentController } from "./outgoing-payment.controller";
import { outgoingPaymentService } from "./outgoing-payment.service";

const router = Router();
router.use(validateSession);

router.get("/", outgoingPaymentController.getList);
router.get("/docnums", loginLimiter, outgoingPaymentController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await outgoingPaymentService.previewNextDocNum(),
    success: true,
  });
});
router.get("/by-doc-num/:docNum", outgoingPaymentController.getByDocNum);
router.get("/accounts", quickLookupController.getAccounts);
router.get("/:id", outgoingPaymentController.getById);
router.post("/", outgoingPaymentController.create);
router.patch("/:id", outgoingPaymentController.update);
router.post("/:id/cancel", outgoingPaymentController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const result = await outgoingPaymentService.getByDocNum(docNum);
    return { attachments: [], doc: result, lines: [] };
  }, "Outgoing Payment"),
);

export const outgoingPaymentRoutes = router;
