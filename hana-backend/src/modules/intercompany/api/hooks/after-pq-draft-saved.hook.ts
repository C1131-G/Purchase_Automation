import { logger } from "@/core/logger/pino-logger";
import {
  createFlow1Orchestrator,
  type Flow1Orchestrator,
} from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/flow-1.orchestrator";
import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";

/**
 * Flow 1 entry after PQ draft save (create or update).
 * Never throws — PQ draft SAP save must remain successful when IC fails.
 */
export const createAfterPqDraftSaved = (
  orchestrator: Flow1Orchestrator = createFlow1Orchestrator(),
) => {
  return async (input: IcPqDraftHookInput): Promise<IcHookResult> => {
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
  };
};

export const afterPqDraftSaved = createAfterPqDraftSaved();
