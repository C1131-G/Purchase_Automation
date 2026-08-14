import { createAppStore } from "@/store/lib/create-store";
import type {
  GrpoLotPendingAction,
  LotSetupReturnTo,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";

export interface GrpoLotSessionState {
  batchesConfirmed: boolean;
  continueSubmit: boolean;
  docLabel: string;
  pendingAction: GrpoLotPendingAction | null;
  reset: () => void;
  returnTo: LotSetupReturnTo | null;
  serialsConfirmed: boolean;
  setReturnTo: (returnTo: LotSetupReturnTo) => void;
  start: (input: {
    docLabel: string;
    pendingAction: GrpoLotPendingAction;
    returnTo: LotSetupReturnTo;
  }) => void;
  confirmBatches: () => void;
  confirmSerials: () => void;
  requestContinueSubmit: () => void;
  clearContinueSubmit: () => void;
  invalidateBatches: () => void;
  invalidateSerials: () => void;
}

const emptySession = {
  batchesConfirmed: false,
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
  setReturnTo: (returnTo) => set({ returnTo }, false, "grpo-lot-session/setReturnTo"),
  start: ({ docLabel, pendingAction, returnTo }) =>
    set(
      {
        continueSubmit: false,
        docLabel,
        pendingAction,
        returnTo,
      },
      false,
      "grpo-lot-session/start",
    ),
}));

export const useGRPOLotSessionStore = storeApi.useStore;
export const createGRPOLotSessionStoreInstance = storeApi.createStore;
