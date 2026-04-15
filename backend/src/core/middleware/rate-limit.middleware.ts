// Rate Limit Middleware: Route-class limiters with proxy-aware keys.

import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
const WINDOW_MS = 15 * 60 * 1000;

const rateLimitIpKey = (req: Request) => ipKeyGenerator(req.ip ?? "unknown");

const authenticatedKey = (req: Request) => {
  const user = (req as Request & { session?: { user?: Record<string, unknown> } }).session?.user;
  const userId = user?.userId ?? user?.id ?? user?.username ?? user?.email;
  if (typeof userId === "string" && userId.trim().length > 0) {
    return `user:${userId}`;
  }
  return `ip:${rateLimitIpKey(req)}`;
};

const buildLimiter = (max: number, message: string, keyGenerator: (req: Request) => string) =>
  rateLimit({
    windowMs: WINDOW_MS,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
  });

// Strict limiter for login endpoint.
export const loginLimiter = buildLimiter(
  10,
  "Too many login attempts. Please try again after 15 minutes.",
  (req) => `ip:${rateLimitIpKey(req)}`,
);

// Moderate limiter for high-frequency lookup endpoints.
export const lookupLimiter = buildLimiter(
  600,
  "Too many lookup requests. Please try again after 15 minutes.",
  authenticatedKey,
);

// Broader limiter for normal authenticated API traffic.
export const authenticatedApiLimiter = buildLimiter(
  5000,
  "Too many requests. Please try again after 15 minutes.",
  authenticatedKey,
);
