import {
  notImplementedResult,
  type IcHookResult,
} from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

/**
 * Flow 2 entry after non-draft PO create.
 * P2/P3: safe skip. P5: wire flow-2.orchestrator.
 */
export async function afterPoCreated(_input: IcPoHookInput): Promise<IcHookResult> {
  return notImplementedResult("flow2_after_po_created");
}
