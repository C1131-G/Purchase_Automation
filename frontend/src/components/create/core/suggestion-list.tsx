import { type CreateLookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'

type SuggestionListProps = {
  items: CreateLookupOption[]
  onSelect: (item: CreateLookupOption) => void
  emptyText?: string
  floating?: boolean
}

export function SuggestionList({
  items,
  onSelect,
  emptyText = 'No records found',
  floating = false,
}: SuggestionListProps) {
  return (
    <div
      className={
        floating
          ? 'absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white'
          : '-mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white'
      }
    >
      <div className="grid grid-cols-[96px_1fr] border-b border-zinc-100 bg-zinc-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        <span>Code</span>
        <span>Name</span>
      </div>
      <div className="max-h-48 overflow-auto">
        {items.length === 0 ? (
          <div className="px-3 py-3 text-sm text-zinc-500">{emptyText}</div>
        ) : null}
        {items.map((item, index) => (
          <button
            key={`${item.code}-${item.name}-${index}`}
            type="button"
            className="grid w-full grid-cols-[96px_1fr] items-start border-b border-zinc-100 px-3 py-1 text-left transition last:border-b-0 hover:bg-zinc-50"
            onMouseDown={(event) => {
              event.preventDefault()
              onSelect(item)
            }}
          >
            <span className="text-[11px] font-semibold text-zinc-500">{item.code}</span>
            <span className="truncate text-sm leading-5 text-zinc-800">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
