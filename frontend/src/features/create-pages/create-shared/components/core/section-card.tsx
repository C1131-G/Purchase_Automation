// SectionCard: A surgical, card-based container for logical form groupings.
import type { CreateSectionCardProps } from "@/features/create-pages/create-shared/utils/create-order.types";

export function SectionCard({ title, children, className }: CreateSectionCardProps) {
  return (
    <section
      className={`flex h-full flex-col overflow-visible rounded-2xl border border-linen-200 bg-surface ${className ?? ""}`.trim()}
    >
      <div className="shrink-0 rounded-t-2xl border-b border-linen-100 px-4 py-2.5">
        <h2 className="text-sm font-medium uppercase tracking-[0.05em] text-ink-900">{title}</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-b-2xl bg-surface px-4 py-4">
        {children}
      </div>
    </section>
  );
}
