import express from "express";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/auth.middleware";
import { transferRequestController } from "./transfer-request.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import {
  TransferRequestDocNumLookupQuerySchema,
  TransferRequestQuerySchema,
} from "./transfer-request.schema";

const router = express.Router();

router.use(validateSession);

router.get(
  "/",
  validateQuery(TransferRequestQuerySchema),
  transferRequestController.getTransferRequests,
);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(TransferRequestDocNumLookupQuerySchema),
  transferRequestController.getTransferRequestDocNums,
);
router.get("/:id", transferRequestController.getTransferRequest);

export const transferRequestRoutes = router;
