/**
 * Preload entry: `node --import ./dist/register.js dist/server.js`
 * or `tsx --import ./src/core/observability/register.ts src/server.ts`
 *
 * Starts OTel before the rest of the app loads instrumented modules.
 * Local `pnpm dev` skips the NodeSDK unless OTLP or METRICS_ENABLED=true is set.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { shouldStartObservability } from "./should-start-observability";

if ((process.env.NODE_ENV || "development") === "development" && !process.env.VITEST) {
  console.log("hana-backend: loading...");
}

function readPackageMeta(): { name: string; version: string } {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // dist/register.js → package root; src/core/observability → ../../../
    const candidates = [join(here, "../../package.json"), join(here, "../../../package.json")];
    for (const candidatePath of candidates) {
      try {
        const raw = readFileSync(candidatePath, "utf8");
        const pkg = JSON.parse(raw) as { name?: string; version?: string };
        return { name: pkg.name || "hana-backend", version: pkg.version || "0.0.0" };
      } catch {
        // try next
      }
    }
  } catch {
    // ignore
  }
  return { name: "hana-backend", version: "0.0.0" };
}

if (shouldStartObservability()) {
  const { startObservability } = await import("./otel-sdk");
  const meta = readPackageMeta();
  startObservability({
    serviceName: meta.name,
    serviceVersion: meta.version,
    includePg: false,
  });
}
