import { AlertTriangle, RefreshCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/shared/utils/cn'

type TableErrorStateProps = {
  title?: string | undefined
  message?: string | undefined
  onRetry?: () => void
  className?: string
}

export function TableErrorState({
  title = 'Unable to load data',
  message = 'Please check your connection and try again.',
  onRetry,
  className,
}: TableErrorStateProps) {
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-white', className)}>
      <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-zinc-200/60 bg-white/80 px-8 py-9 text-center shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-50/80 text-red-500 ring-1 ring-red-100">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold text-zinc-900">{title}</p>
          <p className="text-sm text-zinc-500">{message}</p>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 gap-2 rounded-full border-zinc-200/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 shadow-sm hover:border-zinc-300 hover:text-zinc-900"
            onClick={onRetry}
          >
            <RefreshCcw className="size-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
