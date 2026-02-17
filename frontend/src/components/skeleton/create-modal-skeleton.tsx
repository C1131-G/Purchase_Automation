import { AnimatedModalShell } from '@/components/create/core/animated-modal-shell'

type CreateModalSkeletonProps = {
  title?: string
  subtitle?: string
  columns?: number
  rows?: number
  panelClassName?: string
}

export function CreateModalSkeleton({
  title = 'Loading',
  subtitle,
  columns = 2,
  rows = 6,
  panelClassName = 'max-w-xl',
}: CreateModalSkeletonProps) {
  return (
    <AnimatedModalShell open onClose={() => {}} panelClassName={panelClassName}>
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div className="space-y-1">
          <div className="h-4 w-32 rounded bg-zinc-200 animate-pulse" />
          {subtitle ? <div className="h-3 w-40 rounded bg-zinc-100 animate-pulse" /> : null}
          <span className="sr-only">{title}</span>
        </div>
        <div className="h-7 w-16 rounded-full border border-zinc-100 bg-zinc-50 animate-pulse" />
      </div>

      <div className="p-4">
        <div className="mb-3 h-10 w-full rounded-xl border border-zinc-100 bg-zinc-50 animate-pulse" />
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, index) => (
                <div key={`head-${index}`} className="h-3 w-16 rounded bg-zinc-200 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-auto p-3 space-y-2">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={`row-${index}`}
                className="h-8 w-full rounded-lg bg-zinc-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  )
}
