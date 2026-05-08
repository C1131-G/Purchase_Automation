import express from "express";

import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { authDal } from "@/dal/auth.dal";

const router = express.Router();

router.post("/login", loginLimiter, authDal.login);
router.get("/me", authDal.getCurrentUser);
router.post("/logout", authDal.logout);

export const authRoutes = router;
