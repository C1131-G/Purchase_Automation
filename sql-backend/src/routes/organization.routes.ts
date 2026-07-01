// Organization Routes: Public pre-login endpoint.
// Mirrors hana-backend/src/routes/organization.routes.ts — no validateSession.

import { Router } from "express";
import { organizationDal } from "@/dal/organization.dal";

const router = Router();
router.get("/", organizationDal.getAllOrganizations);

export const organizationRoutes = router;
