// SectionCard: A surgical, card-based container for logical form groupings.
import { type CreateSectionCardProps } from '@/features/create-pages/create-shared/utils/create-order.types'

export function SectionCard({ title, children, className }: CreateSectionCardProps) {
  return (
    <section
      className={`h-full overflow-visible rounded-2xl border border-zinc-200 bg-white ${className ?? ''}`.trim()}
    >
      <div className="rounded-t-2xl border-b border-zinc-100 px-4 py-2.5">
        <h2 className="text-sm font-medium uppercase tracking-[0.05em] text-zinc-700">{title}</h2>
      </div>
      <div className="space-y-3 rounded-b-2xl bg-white px-4 py-3">{children}</div>
    </section>
  )
}
