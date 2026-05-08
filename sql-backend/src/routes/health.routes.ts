import { Router } from "express";
import type { Request, Response } from "express";

import { AppDataSource } from "@/db/config/data-source";

export const healthRoutes = Router();

healthRoutes.get("/", (_req: Request, res: Response) => {
  const isConnected = AppDataSource.isInitialized;
  res.status(200).json({
    database: {
      connected: isConnected,
      uptime: 0,
    },
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});
