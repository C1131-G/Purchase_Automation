import { createAppStore } from "@/store/lib/create-store";

/** SidebarState: Controls the navigation sidebar's expanded/collapsed state. */
interface SidebarState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export function createSidebarStore() {
  return createAppStore<SidebarState>({ name: "sidebar-store" }, (set) => ({
    open: false,
    setOpen: (open) =>
      set((state) => (state.open === open ? state : { open }), false, "sidebar/setOpen"),
    toggleSidebar: () =>
      set((state) => ({ open: !state.open }), false, "sidebar/toggle"),
  }));
}

const sidebarStoreApi = createSidebarStore();

/** useSidebarStore: Global state for sidebar visibility. */
export const useSidebarStore = sidebarStoreApi.useStore;
export const createSidebarStoreInstance = sidebarStoreApi.createStore;

export const useSidebarOpen = () => useSidebarStore((state) => state.open);
export const useSetSidebarAction = () => useSidebarStore((state) => state.setOpen);
export const useToggleSidebarAction = () => useSidebarStore((state) => state.toggleSidebar);
