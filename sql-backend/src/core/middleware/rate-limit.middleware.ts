import type { Request } from "express";
import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

const buildLimiter = (max: number, message: string, keyGenerator: (req: Request) => string) =>
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
  (req) => `ip:${req.ip ?? "unknown"}`,
);

export const lookupLimiter = buildLimiter(
  600,
  "Too many lookup requests. Please try again after 15 minutes.",
  (req) => `user:${(req.session as any)?.user?.userId ?? req.ip ?? "unknown"}`,
);

export const authenticatedApiLimiter = buildLimiter(
  5000,
  "Too many requests. Please try again after 15 minutes.",
  (req) => `user:${(req.session as any)?.user?.userId ?? req.ip ?? "unknown"}`,
);
