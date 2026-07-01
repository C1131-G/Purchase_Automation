import { Router } from "express";

import { getDb } from "@/db/client";

const router = Router();

router.get("/", (_req, res) => {
  let dbStatus = "disconnected";
  try {
    getDb();
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: dbStatus,
  });
});

export const healthRoutes = router;
