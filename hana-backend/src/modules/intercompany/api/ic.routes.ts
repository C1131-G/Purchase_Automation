import express from "express";

import { getIcHealth } from "./ic.controller";

const router = express.Router();

router.get("/health", getIcHealth);

export const icRoutes = router;
