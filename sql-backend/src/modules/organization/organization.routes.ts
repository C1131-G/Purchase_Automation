import { Router } from "express";

import { organizationController } from "./organization.controller";

const router = Router();
router.get("/", organizationController.getAllOrganizations);

export const organizationRoutes = router;
