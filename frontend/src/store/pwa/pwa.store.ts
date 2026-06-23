import { create } from "zustand";

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

export const usePwaStore = create<PwaState>((set) => ({
  deferredPrompt: null,
  isInstalled: false,
  isDesktop: false,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
  setIsInstalled: (isInstalled) => set({ isInstalled }),
  setIsDesktop: (isDesktop) => set({ isDesktop }),
}));

export const useDeferredPrompt = () => usePwaStore((state) => state.deferredPrompt);
export const useIsInstalled = () => usePwaStore((state) => state.isInstalled);
export const useIsDesktop = () => usePwaStore((state) => state.isDesktop);
export const usePwaActions = () => ({
  setDeferredPrompt: usePwaStore((state) => state.setDeferredPrompt),
  setIsInstalled: usePwaStore((state) => state.setIsInstalled),
  setIsDesktop: usePwaStore((state) => state.setIsDesktop),
});
