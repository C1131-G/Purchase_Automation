// Dashboard routes: unified Overview only (dual purchase/sales analytics removed).

import express from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { dashboardController } from "./dashboard.controller";

const router = express.Router();

router.use(validateSession);

router.get("/overview", dashboardController.getOverviewDashboard);

export const dashboardRoutes = router;
