// Auth Routes: Endpoints for managing user sessions and retrieving profile information.

import express from "express";

import { loginLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateSession } from "@/core/middleware/session.middleware";
import { authDal } from "@/dal/auth.dal";
import { validateBody } from "@/validation/middleware/validation.middleware";
import { LoginInputSchema } from "@/validation/schemas/inputs/auth.input";

const router = express.Router();

// POST /login: Public gateway. Protected by rate limiting and strict body validation via Zod.
router.post("/login", loginLimiter, validateBody(LoginInputSchema), authDal.login);

// Security: All subsequent routes require a valid active session.
router.use(validateSession);

// GET /me: Retrieves the user context and database metadata from the current session.
router.get("/me", authDal.getCurrentUser);

// POST /logout: Invalidates the local session and cleans up upstream SAP Service Layer state.
router.post("/logout", authDal.logout);

export const authRoutes = router;
