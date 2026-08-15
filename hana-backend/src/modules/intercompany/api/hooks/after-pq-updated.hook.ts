import { logger } from "@/core/logger/pino-logger";
import {
  createPqEditSyncService,
  type PqEditSyncService,
} from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/01-pq-capture/pq-edit-sync.service";
import { acceptedResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { scheduleIcBackground } from "@/modules/intercompany/infrastructure/schedule-ic-background";

export type AfterPqUpdatedOptions = {
  /**
   * When true (default), schedule IC edit sync off the request so PQ update
   * returns as soon as SAP save succeeds. Set false in unit tests.
   */
  runInBackground?: boolean;
};

/**
 * IC edit sync after real PQ update. Not Flow 1 create.
 * Never throws — portal PQ update must remain successful when IC fails.
 */
export const createAfterPqUpdated = (
  sync: PqEditSyncService = createPqEditSyncService(),
  options: AfterPqUpdatedOptions = {},
) => {
  const runInBackground = options.runInBackground !== false;

  return async (input: IcPqDraftHookInput): Promise<IcHookResult> => {
    if (!runInBackground) {
      try {
        return await sync.sync(input);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({
          cardCode: input.cardCode,
          dbName: input.dbName,
          docEntry: input.docEntry,
          err: err instanceof Error ? err : new Error(message),
          msg: "afterPqUpdated unexpected throw; swallowed",
          scope: "ic.hook.after_pq_updated",
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
        flow: "edit",
        hook: "afterPqUpdated",
      },
      async () => {
        try {
          return await sync.sync(input);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({
            cardCode: input.cardCode,
            dbName: input.dbName,
            docEntry: input.docEntry,
            err: err instanceof Error ? err : new Error(message),
            msg: "afterPqUpdated background unexpected throw; swallowed",
            scope: "ic.hook.after_pq_updated",
          });
          return {
            message: message.slice(0, 2000),
            status: "failed",
          };
        }
      },
    );

    return acceptedResult("edit", "Intercompany edit sync started in background");
  };
};

export const afterPqUpdated = createAfterPqUpdated();
