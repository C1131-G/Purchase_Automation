import type { Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

const buildLimiter = (
  max: number,
  message: string,
  keyGenerator: (req: Request, res: Response) => string,
) =>
  rateLimit({
    keyGenerator,
    legacyHeaders: false,
    limit: max,
    message: { message, success: false },
    standardHeaders: true,
    windowMs: WINDOW_MS,
  });

export const loginLimiter = buildLimiter(
  10,
  "Too many login attempts. Please try again after 15 minutes.",
  (req, res) => `ip:${ipKeyGenerator(req, res)}`,
);

export const lookupLimiter = buildLimiter(
  600,
  "Too many lookup requests. Please try again after 15 minutes.",
  (req, res) => `user:${(req.session as any)?.user?.userId ?? ipKeyGenerator(req, res)}`,
);

export const authenticatedApiLimiter = buildLimiter(
  5000,
  "Too many requests. Please try again after 15 minutes.",
  (req, res) => `user:${(req.session as any)?.user?.userId ?? ipKeyGenerator(req, res)}`,
);
