import { Router } from "express";

import { organizationDal } from "./organization.controller";

const router = Router();
router.get("/", organizationDal.getAllOrganizations);

export const organizationRoutes = router;
