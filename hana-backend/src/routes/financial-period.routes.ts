// Financial Period Routes: Read-only lookup for active financial period data.

import { Router } from "express";

import { validateSession } from "@/core/middleware/session.middleware";
import { financialPeriodDal } from "@/dal/financial-period.dal";

const router = Router();

router.use(validateSession);

router.get("/active", financialPeriodDal.getActivePeriod);
router.get("/resolve-transfer-account", financialPeriodDal.resolveTransferAccount);

export const financialPeriodRoutes = router;
