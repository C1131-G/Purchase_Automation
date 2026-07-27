import { logger } from "@/core/logger/pino-logger";
import {
  createFlow2Orchestrator,
  type Flow2Orchestrator,
} from "@/modules/intercompany/flows/flow-2-po-to-ar-draft/flow-2.orchestrator";
import { acceptedResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { scheduleIcBackground } from "@/modules/intercompany/infrastructure/schedule-ic-background";

export type AfterPoCreatedOptions = {
  /**
   * When true (default), schedule Flow 2 off the request so PO create returns
   * as soon as SAP create succeeds. Set false in unit tests that assert the
   * orchestrator outcome synchronously.
   */
  runInBackground?: boolean;
};

/**
 * Flow 2 entry after non-draft PO create.
 * Never throws — PO SAP create must remain successful when IC fails.
 * By default IC completes in the background after the main document response.
 */
export const createAfterPoCreated = (
  orchestrator: Flow2Orchestrator = createFlow2Orchestrator(),
  options: AfterPoCreatedOptions = {},
) => {
  const runInBackground = options.runInBackground !== false;

  return async (input: IcPoHookInput): Promise<IcHookResult> => {
    if (!runInBackground) {
      try {
        return await orchestrator.run(input);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({
          cardCode: input.cardCode,
          dbName: input.dbName,
          docEntry: input.docEntry,
          err: err instanceof Error ? err : new Error(message),
          msg: "afterPoCreated unexpected throw; swallowed",
          scope: "ic.hook.after_po_created",
        });
        return {
          message: message.slice(0, 2000),
          status: "failed",
        };
      }
    }

    scheduleIcBackground(
      {
        cardCode: input.cardCode,
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
        flow: "flow2",
        hook: "afterPoCreated",
      },
      async () => {
        try {
          return await orchestrator.run(input);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({
            cardCode: input.cardCode,
            dbName: input.dbName,
            docEntry: input.docEntry,
            err: err instanceof Error ? err : new Error(message),
            msg: "afterPoCreated background unexpected throw; swallowed",
            scope: "ic.hook.after_po_created",
          });
          return {
            message: message.slice(0, 2000),
            status: "failed",
          };
        }
      },
    );

    return acceptedResult("flow2");
  };
};

export const afterPoCreated = createAfterPoCreated();
