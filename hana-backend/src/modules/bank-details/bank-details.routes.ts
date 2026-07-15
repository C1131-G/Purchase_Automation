// Bank Details Routes: Read-only endpoint for bank master data lookups.

import express from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { bankDetailsController } from "./bank-details.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { MasterDataQuerySchema } from "./bank-details.schema";

const router = express.Router();

// Security: All bank detail operations require an active session.
router.use(validateSession);

// GET /: Searchable list of banks from the ODSC table.
router.get("/", validateQuery(MasterDataQuerySchema), bankDetailsController.getBankDetails);

export const bankDetailsRoutes = router;
