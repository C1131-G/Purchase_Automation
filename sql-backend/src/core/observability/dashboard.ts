import { recordDashboardSection } from "./metrics";
import { withSpan } from "./tracing";

/** Wrap a dashboard section builder with span + histogram. */
export async function timedDashboardSection<T>(
  section: string,
  run: () => Promise<T> | T,
): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    return await withSpan("dashboard.section", { "dashboard.section": section }, async () => run());
  } finally {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    recordDashboardSection(section, durationSec);
  }
}
