import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateBody } from "@/core/middleware/validation.middleware";

import { authController } from "./auth.controller";
import { LoginInputSchema } from "./auth.schema";

const router = Router();

router.post("/login", loginLimiter, validateBody(LoginInputSchema), authController.login);

router.use(validateSession);

router.get("/me", authController.getCurrentUser);
router.post("/logout", authController.logout);

export const authRoutes = router;
