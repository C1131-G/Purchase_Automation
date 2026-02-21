import { create } from 'zustand'

/** SidebarState: Controls the navigation sidebar's expanded/collapsed state. */
type SidebarState = {
  open: boolean
  setOpen: (open: boolean) => void
  toggleSidebar: () => void
}

/** useSidebarStore: Global state for sidebar visibility. */
export const useSidebarStore = create<SidebarState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggleSidebar: () => set((state) => ({ open: !state.open })),
}))

export const useSidebarOpen = () => useSidebarStore((state) => state.open)
export const useSetSidebarAction = () => useSidebarStore((state) => state.setOpen)
export const useToggleSidebarAction = () => useSidebarStore((state) => state.toggleSidebar)
