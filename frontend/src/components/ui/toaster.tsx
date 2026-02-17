import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useEffect } from 'react'

import { cn } from '@/shared/utils/cn'
import { type AppToast, type ToastVariant, useToastStore } from '@/store/toast.store'

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
}

const variantIcon: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: TriangleAlert,
}

function ToastItem({ item }: { item: AppToast }) {
  const dismissToast = useToastStore((state) => state.dismissToast)
  const Icon = variantIcon[item.variant]

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dismissToast(item.id)
    }, item.durationMs)
    return () => window.clearTimeout(timer)
  }, [dismissToast, item.durationMs, item.id])

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-xl border px-3 py-2 shadow-sm backdrop-blur-sm transition',
        variantStyles[item.variant],
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          {item.description ? (
            <p className="mt-0.5 text-xs leading-4 opacity-85">{item.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dismissToast(item.id)}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md opacity-70 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Close toast"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(92vw,360px)] flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </div>
  )
}
