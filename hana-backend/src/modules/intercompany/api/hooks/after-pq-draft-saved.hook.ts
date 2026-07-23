import {
  notImplementedResult,
  type IcHookResult,
} from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";

/**
 * Flow 1 entry after PQ draft save.
 * P2/P3: safe skip. P6: wire flow-1.orchestrator.
 */
export async function afterPqDraftSaved(_input: IcPqDraftHookInput): Promise<IcHookResult> {
  return notImplementedResult("flow1_after_pq_draft_saved");
}
