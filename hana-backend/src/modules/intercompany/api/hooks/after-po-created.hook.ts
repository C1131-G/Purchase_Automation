import { logger } from "@/core/logger/pino-logger";
import {
  createFlow2Orchestrator,
  type Flow2Orchestrator,
} from "@/modules/intercompany/flows/flow-2-po-to-ar-draft/flow-2.orchestrator";
import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

/**
 * Flow 2 entry after non-draft PO create.
 * Never throws — PO SAP create must remain successful when IC fails.
 */
export const createAfterPoCreated = (
  orchestrator: Flow2Orchestrator = createFlow2Orchestrator(),
) => {
  return async (input: IcPoHookInput): Promise<IcHookResult> => {
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
  };
};

export const afterPoCreated = createAfterPoCreated();
