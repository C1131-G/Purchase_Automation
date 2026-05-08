// Health Check Routes: Monitoring endpoints for system availability and connectivity status.

import { Router } from "express";
import type { Request, Response } from "express";

import { hanaPool } from "@/services/hana.service";

export const healthRoutes = Router();

// GET /: Returns basic uptime and HANA connection status. Used by load balancers and monitoring tools.
healthRoutes.get("/", (_req: Request, res: Response) => {
  const poolStats = hanaPool.getPoolStats();
  res.status(200).json({
    database: {
      connected: poolStats.isConnected,
      uptime: poolStats.uptime || 0,
    },
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});
