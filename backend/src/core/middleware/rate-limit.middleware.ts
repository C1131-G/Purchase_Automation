// Rate Limit Middleware: Protects the API from brute-force attacks and denial-of-service (DoS) by throttling request volume.

import rateLimit from "express-rate-limit";

// Login Limiter: Strict policy for authentication attempts. Restricts a single IP to 5 login attempts every 15 minutes to prevent password guessing.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  // Injects standard headers (RateLimit-Limit/Remaining/Reset) into the response for client-side throttling awareness.
  standardHeaders: true,
  legacyHeaders: false,
});

// API Limiter: General usage policy for authenticated routes. Prevents aggressive automated scraping or recursive API loops.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
