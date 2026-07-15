import express from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { transferController } from "./transfer.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { TransferQuerySchema, TransferDocNumLookupQuerySchema } from "./transfer.schema";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(TransferQuerySchema), transferController.getTransfers);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(TransferDocNumLookupQuerySchema),
  transferController.getTransferDocNums,
);
router.get("/:id", transferController.getTransfer);

export const transferRoutes = router;
