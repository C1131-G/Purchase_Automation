import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { bankDetailsDal } from "./bank-details.controller";

const router = Router();
router.use(validateSession);
router.get("/", bankDetailsDal.getList);

export const bankDetailsRoutes = router;
