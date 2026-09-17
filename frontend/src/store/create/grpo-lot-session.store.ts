import { createAppStore } from "@/store/lib/create-store";
import type {
  GrpoCreateFormChrome,
  GrpoLotPendingAction,
  LotSetupReturnTo,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";

/**
 * Client state that ties the create-GRPO form to the lot setup modal.
 *
 * Lot setup used to be a separate route, so anything the create page kept in
 * React state (attachments, addresses, warehouse/vendor inputs) had to be
 * stashed here to survive the navigation. It also carries the progress of the
 * batch/serial steps and the create action the modal intercepted, so the modal
 * can name the right button and hand the save back to the create page.
 */
export interface GrpoLotSessionState {
  /** Batch step confirmed — cleared again when lines change and need re-checking. */
  batchesConfirmed: boolean;
  /** Create-page fields captured before the modal took over. */
  chrome: GrpoCreateFormChrome | null;
  /** Set when the flow finished and the create page should run the pending save. */
  continueSubmit: boolean;
  /** Doc number shown in the modal header / Doc. No. column ("New" when unsaved). */
  docLabel: string;
  /** Create action the user triggered (save-new / view / close / draft). */
  pendingAction: GrpoLotPendingAction | null;
  reset: () => void;
  /** Route + search state to restore when the modal closes. */
  returnTo: LotSetupReturnTo | null;
  /** Serial step confirmed — same re-check semantics as `batchesConfirmed`. */
  serialsConfirmed: boolean;
  setChrome: (chrome: GrpoCreateFormChrome) => void;
  setDocLabel: (docLabel: string) => void;
  setReturnTo: (returnTo: LotSetupReturnTo) => void;
  start: (input: {
    chrome?: GrpoCreateFormChrome;
    docLabel: string;
    pendingAction: GrpoLotPendingAction;
    returnTo: LotSetupReturnTo;
  }) => void;
  /** Batch step: confirmed on OK, invalidated when the lines change underneath it. */
  confirmBatches: () => void;
  /** Serial step: same confirm/invalidate pair as batches. */
  confirmSerials: () => void;
  /** Signals the create page to run the save the modal intercepted. */
  requestContinueSubmit: () => void;
  clearContinueSubmit: () => void;
  invalidateBatches: () => void;
  invalidateSerials: () => void;
}

/** Session defaults — the same object is reused by `reset` for a clean slate. */
const emptySession = {
  batchesConfirmed: false,
  chrome: null,
  continueSubmit: false,
  docLabel: "New",
  pendingAction: null,
  returnTo: null,
  serialsConfirmed: false,
} as const;

const storeApi = createAppStore<GrpoLotSessionState>({ name: "grpo-lot-session" }, (set) => ({
  ...emptySession,
  clearContinueSubmit: () =>
    set({ continueSubmit: false }, false, "grpo-lot-session/clearContinueSubmit"),
  confirmBatches: () => set({ batchesConfirmed: true }, false, "grpo-lot-session/confirmBatches"),
  confirmSerials: () => set({ serialsConfirmed: true }, false, "grpo-lot-session/confirmSerials"),
  requestContinueSubmit: () =>
    set({ continueSubmit: true }, false, "grpo-lot-session/requestContinueSubmit"),
  invalidateBatches: () =>
    set({ batchesConfirmed: false }, false, "grpo-lot-session/invalidateBatches"),
  invalidateSerials: () =>
    set({ serialsConfirmed: false }, false, "grpo-lot-session/invalidateSerials"),
  reset: () => set({ ...emptySession }, false, "grpo-lot-session/reset"),
  setChrome: (chrome) => set({ chrome }, false, "grpo-lot-session/setChrome"),
  setDocLabel: (docLabel) => set({ docLabel }, false, "grpo-lot-session/setDocLabel"),
  setReturnTo: (returnTo) => set({ returnTo }, false, "grpo-lot-session/setReturnTo"),
  start: ({ chrome, docLabel, pendingAction, returnTo }) =>
    set(
      (prev) => ({
        continueSubmit: false,
        docLabel,
        pendingAction,
        returnTo,
        chrome: chrome ?? prev.chrome,
      }),
      false,
      "grpo-lot-session/start",
    ),
}));

export const useGRPOLotSessionStore = storeApi.useStore;
export const createGRPOLotSessionStoreInstance = storeApi.createStore;
