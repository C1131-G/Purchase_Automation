// Sales Relationship Routes: Single endpoint for document relationship tracing.
// Mirrors hana-backend/src/routes/sales-relationship.routes.ts

import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { salesRelationshipDal } from "@/dal/sales-relationship.dal";

const router = Router();
router.use(validateSession);
router.get("/:docType/:docEntry", salesRelationshipDal.getRelationshipMap);

export const salesRelationshipRoutes = router;
