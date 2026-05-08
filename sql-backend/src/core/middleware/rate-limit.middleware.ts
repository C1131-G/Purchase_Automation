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
    keyGenerator,
    legacyHeaders: false,
    max,
    message: { message, success: false },
    standardHeaders: true,
    windowMs: WINDOW_MS,
  });

export const loginLimiter = buildLimiter(
  10,
  "Too many login attempts. Please try again after 15 minutes.",
  (req) => `ip:${rateLimitIpKey(req)}`,
);

export const lookupLimiter = buildLimiter(
  600,
  "Too many lookup requests. Please try again after 15 minutes.",
  authenticatedKey,
);

export const authenticatedApiLimiter = buildLimiter(
  5000,
  "Too many requests. Please try again after 15 minutes.",
  authenticatedKey,
);
