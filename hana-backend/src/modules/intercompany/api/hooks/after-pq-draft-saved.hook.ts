import { logger } from "@/core/logger/pino-logger";
import {
  createFlow1Orchestrator,
  type Flow1Orchestrator,
} from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/flow-1.orchestrator";
import { acceptedResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { scheduleIcBackground } from "@/modules/intercompany/infrastructure/schedule-ic-background";

export type AfterPqDraftSavedOptions = {
  /**
   * When true (default), schedule Flow 1 off the request so PQ draft create/update
   * returns as soon as SAP save succeeds. Set false in unit tests that assert
   * the orchestrator outcome synchronously.
   */
  runInBackground?: boolean;
};

/**
 * Flow 1 entry after PQ draft save (create or update).
 * Never throws — PQ draft SAP save must remain successful when IC fails.
 * By default IC completes in the background after the main document response.
 */
export const createAfterPqDraftSaved = (
  orchestrator: Flow1Orchestrator = createFlow1Orchestrator(),
  options: AfterPqDraftSavedOptions = {},
) => {
  const runInBackground = options.runInBackground !== false;

  return async (input: IcPqDraftHookInput): Promise<IcHookResult> => {
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
          msg: "afterPqDraftSaved unexpected throw; swallowed",
          scope: "ic.hook.after_pq_draft_saved",
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
        flow: "flow1",
        hook: "afterPqDraftSaved",
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
            msg: "afterPqDraftSaved background unexpected throw; swallowed",
            scope: "ic.hook.after_pq_draft_saved",
          });
          return {
            message: message.slice(0, 2000),
            status: "failed",
          };
        }
      },
    );

    return acceptedResult("flow1");
  };
};

export const afterPqDraftSaved = createAfterPqDraftSaved();
