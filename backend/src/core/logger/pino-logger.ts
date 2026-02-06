// Pino Logger: High-performance structural logger. Configured to emit machine-readable JSON in production (for ingestion by Elastic/Grafana) and human-friendly 'pretty' logs in development.

import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

// Post-processes stack traces to extract only the most relevant 'at' line, reducing log noise in the console.
const formatStack = (stack: unknown) => {
  if (typeof stack !== "string") return String(stack);

  const lines = stack.split("\n");

  // Prioritize files outside of node_modules to pinpoint application-level logic errors.
  const fileLine =
    lines.find((l) => l.trim().startsWith("at ") && !l.includes("node_modules")) ||
    lines.find((l) => l.trim().startsWith("at "));

  if (!fileLine) return stack;

  let location = fileLine.trim().replace(/^at /, "");
  // Cleans up the location string by removing parentheses formatting.
  const parenMatch = location.match(/\((.+)\)/);
  if (parenMatch) {
    location = parenMatch[1];
  }

  return location;
};

let stream: pino.DestinationStream | undefined;

if (isDev) {
  // Uses dynamic import for pino-pretty to ensure it is not bundled or loaded in production environments.
  const { default: pretty } = await import("pino-pretty");

  stream = pretty({
    colorize: true,
    translateTime: "SYS:hh:mm:ss TT",
    // Filters out metadata that is redundant during interactive development.
    ignore: "pid,hostname,responseTime",
    messageFormat: "{msg}",
    singleLine: false,
    hideObject: false,
    customPrettifiers: {
      stack: formatStack,
    },
  });
}

// Global logger instance with configurable Log Level (info, warn, error, debug).
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
  },
  stream,
);
