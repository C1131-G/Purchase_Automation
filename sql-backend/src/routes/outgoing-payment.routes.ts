import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { outgoingPaymentDal } from "@/dal/outgoing-payment.dal";
import { quickLookupDal } from "@/dal/quick-lookup.dal";
import { createExportHandler } from "@/dal/export.dal";
import { outgoingPaymentService } from "@/services/outgoing-payment.service";
const router = Router();
router.use(validateSession);
router.get("/", outgoingPaymentDal.getList);
router.get("/docnums", loginLimiter, outgoingPaymentDal.getDocNums);
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
    return { doc: r, lines: [], attachments: [] };
  }, "Outgoing Payment"),
);
export const outgoingPaymentRoutes = router;
