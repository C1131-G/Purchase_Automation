import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export type AppToast = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  durationMs: number
}

type CreateToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

type ToastState = {
  toasts: AppToast[]
  pushToast: (input: CreateToastInput) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
}

const DEFAULT_DURATION_MS = 3000
const MAX_TOASTS = 5

const buildToastId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: ({ title, description, variant = 'info', durationMs = DEFAULT_DURATION_MS }) => {
    const id = buildToastId()
    const nextToast: AppToast = {
      id,
      title,
      variant,
      durationMs,
      ...(description !== undefined ? { description } : {}),
    }
    set((prev) => ({
      toasts: [...prev.toasts.slice(Math.max(prev.toasts.length - (MAX_TOASTS - 1), 0)), nextToast],
    }))
    return id
  },
  dismissToast: (id) =>
    set((prev) => ({
      toasts: prev.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}))

const pushVariantToast = (variant: ToastVariant, title: string, description?: string) => {
  if (description === undefined) {
    return useToastStore.getState().pushToast({ title, variant })
  }
  return useToastStore.getState().pushToast({ title, description, variant })
}

export const toast = {
  show: (input: CreateToastInput) => useToastStore.getState().pushToast(input),
  success: (title: string, description?: string) => pushVariantToast('success', title, description),
  error: (title: string, description?: string) => pushVariantToast('error', title, description),
  info: (title: string, description?: string) => pushVariantToast('info', title, description),
  warning: (title: string, description?: string) => pushVariantToast('warning', title, description),
  dismiss: (id: string) => useToastStore.getState().dismissToast(id),
  clear: () => useToastStore.getState().clearToasts(),
}
