import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { bankDetailsController } from "./bank-details.controller";

const router = Router();
router.use(validateSession);
router.get("/", bankDetailsController.getList);

export const bankDetailsRoutes = router;
