import { useShallow } from "zustand/react/shallow";

import { createAppStore } from "@/store/lib/create-store";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isDesktop: boolean;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setIsInstalled: (installed: boolean) => void;
  setIsDesktop: (isDesktop: boolean) => void;
}

export function createPwaStore() {
  return createAppStore<PwaState>({ name: "pwa-store" }, (set) => ({
    deferredPrompt: null,
    isInstalled: false,
    isDesktop: false,
    setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }, false, "pwa/setDeferredPrompt"),
    setIsInstalled: (isInstalled) => set({ isInstalled }, false, "pwa/setIsInstalled"),
    setIsDesktop: (isDesktop) => set({ isDesktop }, false, "pwa/setIsDesktop"),
  }));
}

const pwaStoreApi = createPwaStore();

export const usePwaStore = pwaStoreApi.useStore;
export const createPwaStoreInstance = pwaStoreApi.createStore;

export const useDeferredPrompt = () => usePwaStore((state) => state.deferredPrompt);
export const useIsInstalled = () => usePwaStore((state) => state.isInstalled);
export const useIsDesktop = () => usePwaStore((state) => state.isDesktop);

/** Atomic action hooks — prefer these for single-field updates. */
export const useSetDeferredPromptAction = () => usePwaStore((state) => state.setDeferredPrompt);
export const useSetIsInstalledAction = () => usePwaStore((state) => state.setIsInstalled);
export const useSetIsDesktopAction = () => usePwaStore((state) => state.setIsDesktop);

/** Multi-action bundle with shallow compare so object identity is stable when actions are. */
export const usePwaActions = () =>
  usePwaStore(
    useShallow((state) => ({
      setDeferredPrompt: state.setDeferredPrompt,
      setIsInstalled: state.setIsInstalled,
      setIsDesktop: state.setIsDesktop,
    })),
  );
