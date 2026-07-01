import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateBody } from "@/core/middleware/validation.middleware";
import { authDal } from "@/dal/auth.dal";
import { LoginInputSchema } from "@/validation/schemas/inputs/auth.input";

const router = Router();

router.post("/login", loginLimiter, validateBody(LoginInputSchema), authDal.login);

router.use(validateSession);

router.get("/me", authDal.getCurrentUser);
router.post("/logout", authDal.logout);

export const authRoutes = router;
