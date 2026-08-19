process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.OTEL_SDK_DISABLED = "true";

// Set fallback mock environment variables for unit/smoke tests if not provided
process.env.HANA_HOST = process.env.HANA_HOST || "localhost";
process.env.HANA_PORT = process.env.HANA_PORT || "30015";
process.env.HANA_USER = process.env.HANA_USER || "SYSTEM";
process.env.HANA_PASSWORD = process.env.HANA_PASSWORD || "TestPassword123!";
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "0123456789012345678901234567890123456789012345678901234567890123456789";
process.env.PORTAL_PASSWORD_SALT_ROUNDS = process.env.PORTAL_PASSWORD_SALT_ROUNDS || "10";
process.env.SERVICE_LAYER_URL = process.env.SERVICE_LAYER_URL || "http://localhost:50000";
process.env.ATTACHMENTS_BASE_PATH = process.env.ATTACHMENTS_BASE_PATH || "/tmp/attachments";
process.env.COMMON_DB = process.env.COMMON_DB || "SBOCOMMON";
process.env.ORGANIZATION_TABLE = process.env.ORGANIZATION_TABLE || "ORGC";
process.env.DEFAULT_CURRENCY_CODE = process.env.DEFAULT_CURRENCY_CODE || "USD";

// Background HANA client pipe errors can surface when the Express app is
// imported without a live HANA instance. Swallow only those known noise errors
// so unit/integration suites stay green offline.
const isHanaPipeNoise = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
  return msg.includes("hdbpipe") || (code === "ENOENT" && msg.includes("connect"));
};

process.on("uncaughtException", (err) => {
  if (isHanaPipeNoise(err)) {
    return;
  }
  throw err;
});

process.on("unhandledRejection", (reason) => {
  if (isHanaPipeNoise(reason)) {
    return;
  }
  // Re-throw unexpected rejections so real bugs still fail the run.
  throw reason instanceof Error ? reason : new Error(String(reason));
});
