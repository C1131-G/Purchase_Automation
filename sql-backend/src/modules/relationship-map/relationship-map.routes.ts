import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { salesRelationshipController } from "./relationship-map.controller";

const router = Router();
router.use(validateSession);
router.get("/:docType/:docEntry", salesRelationshipController.getRelationshipMap);

export const salesRelationshipRoutes = router;
