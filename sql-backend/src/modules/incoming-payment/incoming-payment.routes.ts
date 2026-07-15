import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { createExportHandler } from "@/shared/route-handlers/create-document-export-handler";
import { quickLookupController } from "@/shared/route-handlers/quick-lookup.handler";

import { incomingPaymentController } from "./incoming-payment.controller";
import { incomingPaymentService } from "./incoming-payment.service";

const router = Router();
router.use(validateSession);

router.get("/", incomingPaymentController.getList);
router.get("/docnums", loginLimiter, incomingPaymentController.getDocNums);
router.get("/next-docnum", async (_req, res) => {
  res.json({
    data: await incomingPaymentService.previewNextDocNum(),
    success: true,
  });
});
router.get("/by-doc-num/:docNum", incomingPaymentController.getByDocNum);
router.get("/accounts", quickLookupController.getAccounts);
router.get("/:id", incomingPaymentController.getById);
router.post("/", incomingPaymentController.create);
router.patch("/:id", incomingPaymentController.update);
router.post("/:id/cancel", incomingPaymentController.cancel);

router.get(
  "/by-doc-num/:docNum/export/:format",
  createExportHandler(async (docNum) => {
    const result = await incomingPaymentService.getByDocNum(docNum);
    return { attachments: [], doc: result, lines: [] };
  }, "Incoming Payment"),
);

export const incomingPaymentRoutes = router;
