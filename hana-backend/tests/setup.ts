process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.OTEL_SDK_DISABLED = "true";

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
