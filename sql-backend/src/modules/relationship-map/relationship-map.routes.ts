import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { salesRelationshipDal } from "./relationship-map.controller";

const router = Router();
router.use(validateSession);
router.get("/:docType/:docEntry", salesRelationshipDal.getRelationshipMap);

export const salesRelationshipRoutes = router;
