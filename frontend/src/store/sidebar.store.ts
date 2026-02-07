import { create } from 'zustand'

interface SidebarState {
  open: boolean
  setOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggleSidebar: () => set((state) => ({ open: !state.open })),
}))

export const useSidebarOpen = () => useSidebarStore((state) => state.open)
export const useSetSidebarAction = () => useSidebarStore((state) => state.setOpen)
export const useToggleSidebarAction = () => useSidebarStore((state) => state.toggleSidebar)
