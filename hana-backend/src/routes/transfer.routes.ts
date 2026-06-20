import express from "express";
import { validateSession } from "@/core/middleware/session.middleware";
import { transferDal } from "@/dal/transfer.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  TransferQuerySchema,
  TransferDocNumLookupQuerySchema,
} from "@/validation/schemas/inputs/transfer.input";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(TransferQuerySchema), transferDal.getTransfers);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(TransferDocNumLookupQuerySchema),
  transferDal.getTransferDocNums,
);
router.get("/:id", transferDal.getTransfer);

export const transferRoutes = router;
