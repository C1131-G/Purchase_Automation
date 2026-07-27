/**
 * Schedule IC orchestration after the main SAP document response has been
 * prepared. Uses setImmediate so Express can flush the HTTP response first;
 * the full IC flow (SL partner posts, RFQ/AR, notifications) runs off-request.
 */

import { logger } from "@/core/logger/pino-logger";

import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

export type IcBackgroundMeta = {
  cardCode?: string;
  dbName?: string;
  docEntry?: number;
  docNum?: number | null;
  flow: "flow1" | "flow2";
  hook: string;
};

/**
 * Fire-and-forget IC work. Never rejects to the caller.
 * Errors are logged; flow orchestrators already enqueue retries on SL failure.
 */
export const scheduleIcBackground = (
  meta: IcBackgroundMeta,
  work: () => Promise<IcHookResult>,
): void => {
  const run = (): void => {
    const startedAt = Date.now();
    void work()
      .then((result) => {
        logger.info({
          ...meta,
          durationMs: Date.now() - startedAt,
          msg: "IC background flow completed",
          resultStatus: result.status,
          scope: `ic.background.${meta.flow}`,
        });
      })
      .catch((err: unknown) => {
        logger.error({
          ...meta,
          durationMs: Date.now() - startedAt,
          err: err instanceof Error ? err : new Error(String(err)),
          msg: "IC background flow threw (swallowed; main document already saved)",
          scope: `ic.background.${meta.flow}`,
        });
      });
  };

  if (typeof setImmediate === "function") {
    setImmediate(run);
    return;
  }

  setTimeout(run, 0);
};
