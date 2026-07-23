import type { Request, Response } from "express";

/** GET /api/ic/health — module liveness (session-protected when mounted under authenticated API). */
export const getIcHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    data: {
      module: "intercompany",
      ok: true,
      phase: "P5",
    },
    success: true,
  });
};
