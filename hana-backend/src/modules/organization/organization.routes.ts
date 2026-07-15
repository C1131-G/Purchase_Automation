// Organization Routes: Endpoints for tenant discovery and metadata retrieval.

import express from "express";

import { organizationController } from "./organization.controller";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { OrganizationQuerySchema } from "./organization.schema";

const router = express.Router();

// GET /: Public endpoint (pre-login) used to populate the tenant selection dropdown on the login page.
router.get("/", validateQuery(OrganizationQuerySchema), organizationController.getAllOrganizations);

export const organizationRoutes = router;
