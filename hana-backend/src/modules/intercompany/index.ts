/**
 * Intercompany public wall — external modules import only from here.
 */

export { afterPoCreated } from "./api/hooks/after-po-created.hook";
export { afterPoUpdated } from "./api/hooks/after-po-updated.hook";
export {
  assertIcPoEditable,
  assertIcPqEditable,
  assertIcSqEditable,
  recordIcPqToPoLink,
} from "./api/ic-edit-lifecycle";
export {
  afterPqSaved,
  /** @deprecated Prefer `afterPqSaved`. */
  afterPqDraftSaved,
} from "./api/hooks/after-pq-saved.hook";
export { icRoutes } from "./api/ic.routes";
export type { IcHookResult } from "./flows/shared/flow-result";
export { acceptedResult } from "./flows/shared/flow-result";
export type { IcPoHookInput, IcPqDraftHookInput } from "./flows/shared/flow.types";
export { IC_OBJECT } from "./infrastructure/object-codes";
export { IC_CONFIG_KEY } from "./infrastructure/constants";
