import { RefreshCcw, ServerCrash } from 'lucide-react'

import { Button } from '@/components/button'
import { cn } from '@/shared/utils/cn'

type TableErrorStateProps = {
  title?: string | undefined
  message?: string | undefined
  onRetry?: () => void
  className?: string
}

export function TableErrorState({
  title = 'Unable to load data',
  message = 'Please check your connection or contact support if the problem persists.',
  onRetry,
  className,
}: TableErrorStateProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-zinc-50/50 px-4 py-12',
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-zinc-100 bg-white px-8 py-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-900/5 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
        {/* Playful, softer icon container */}
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 text-red-500 shadow-sm ring-1 ring-red-100/50">
          <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-xl" />
          <ServerCrash className="relative size-7 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h3>
          <p className="mx-auto max-w-[36ch] text-[13px] leading-relaxed text-zinc-500">
            {message}
          </p>
        </div>

        {onRetry && (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="h-10 gap-2 rounded-xl border-zinc-200 bg-white px-6 text-[13px] font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 focus:ring-2 focus:ring-zinc-200"
              onClick={onRetry}
            >
              <RefreshCcw className="size-3.5" />
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
