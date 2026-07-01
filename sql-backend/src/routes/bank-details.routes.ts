import { Router } from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { bankDetailsDal } from "@/dal/bank-details.dal";

const router = Router();
router.use(validateSession);
router.get("/", bankDetailsDal.getList);
export const bankDetailsRoutes = router;
