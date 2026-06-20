import express from "express";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { transferRequestDal } from "@/dal/transfer-request.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  TransferRequestDocNumLookupQuerySchema,
  TransferRequestQuerySchema,
} from "@/validation/schemas/inputs/transfer-request.input";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(TransferRequestQuerySchema), transferRequestDal.getTransferRequests);
router.get(
  "/docnums",
  lookupLimiter,
  validateQuery(TransferRequestDocNumLookupQuerySchema),
  transferRequestDal.getTransferRequestDocNums,
);
router.get("/:id", transferRequestDal.getTransferRequest);

export const transferRequestRoutes = router;
