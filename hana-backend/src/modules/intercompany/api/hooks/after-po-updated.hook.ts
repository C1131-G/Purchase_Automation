import { logger } from "@/core/logger/pino-logger";
import {
  createPoEditSyncService,
  type PoEditSyncService,
} from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/po-edit-sync.service";
import { acceptedResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { scheduleIcBackground } from "@/modules/intercompany/infrastructure/schedule-ic-background";

export type AfterPoUpdatedOptions = {
  runInBackground?: boolean;
};

/**
 * IC edit sync after real PO update. Not Flow 2 create.
 * Never throws — portal PO update must remain successful when IC fails.
 */
export const createAfterPoUpdated = (
  sync: PoEditSyncService = createPoEditSyncService(),
  options: AfterPoUpdatedOptions = {},
) => {
  const runInBackground = options.runInBackground !== false;

  return async (input: IcPoHookInput): Promise<IcHookResult> => {
    if (!runInBackground) {
      try {
        return await sync.sync(input);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({
          dbName: input.dbName,
          docEntry: input.docEntry,
          err: err instanceof Error ? err : new Error(message),
          msg: "afterPoUpdated unexpected throw; swallowed",
          scope: "ic.hook.after_po_updated",
        });
        return { message: message.slice(0, 2000), status: "failed" };
      }
    }

    scheduleIcBackground(
      {
        cardCode: input.cardCode,
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
        flow: "edit",
        hook: "afterPoUpdated",
      },
      async () => {
        try {
          return await sync.sync(input);
        } catch (error: unknown) {
          logger.error({
            err: error instanceof Error ? error : new Error(String(error)),
            msg: "afterPoUpdated failed; PO remains saved",
            scope: "ic.hook.after_po_updated",
          });
          return { message: String(error), status: "failed" };
        }
      },
    );
    return acceptedResult("edit", "Intercompany edit sync started in background");
  };
};

export const afterPoUpdated = createAfterPoUpdated();
