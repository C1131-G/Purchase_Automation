// Bank Details Routes: Read-only endpoint for bank master data lookups.

import express from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { bankDetailsDal } from "@/dal/bank-details.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { MasterDataQuerySchema } from "@/validation/schemas/inputs/master-data.input";

const router = express.Router();

// Security: All bank detail operations require an active session.
router.use(validateSession);

// GET /: Searchable list of banks from the ODSC table.
router.get("/", validateQuery(MasterDataQuerySchema), bankDetailsDal.getBankDetails);

export const bankDetailsRoutes = router;
