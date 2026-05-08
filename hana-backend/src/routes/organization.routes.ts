// Organization Routes: Endpoints for tenant discovery and metadata retrieval.

import express from "express";

import { organizationDal } from "@/dal/organization.dal";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import { OrganizationQuerySchema } from "@/validation/schemas/inputs/organization.input";

const router = express.Router();

// GET /: Public endpoint (pre-login) used to populate the tenant selection dropdown on the login page.
router.get("/", validateQuery(OrganizationQuerySchema), organizationDal.getAllOrganizations);

export const organizationRoutes = router;
