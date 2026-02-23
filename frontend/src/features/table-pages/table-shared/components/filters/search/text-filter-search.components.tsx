import { Search, X } from 'lucide-react'

import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { cn } from '@/shared/utils/cn'

type SearchLeftIconProps = {
  visible: boolean
}

export function SearchLeftIcon({ visible }: SearchLeftIconProps) {
  if (!visible) return null
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-within:text-blue-600 transition-colors pointer-events-none">
      <Search className="size-3.5" />
    </div>
  )
}

type SearchActionButtonsProps = {
  isDocLookupStyleColumn: boolean
  isDocNumberColumn: boolean
  activeColumnId: string
  searchValue: string
  canOpenLookupPopup: boolean
  onClearInput: () => void
  onOpenPopup: () => void
  onPopupIntent: () => void
  onDocNumberSearch: () => void
}

export function SearchActionButtons({
  isDocLookupStyleColumn,
  isDocNumberColumn,
  activeColumnId,
  searchValue,
  canOpenLookupPopup,
  onClearInput,
  onOpenPopup,
  onPopupIntent,
  onDocNumberSearch,
}: SearchActionButtonsProps) {
  return (
    <div
      className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1',
        isDocLookupStyleColumn && 'gap-0',
      )}
    >
      {!isDocLookupStyleColumn && searchValue && (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onClick={onClearInput}
          className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
          tabIndex={-1}
        >
          <X className="size-3.5" />
        </button>
      )}

      {isDocLookupStyleColumn ? (
        canOpenLookupPopup ? (
          <button
            type="button"
            onClick={onOpenPopup}
            onPointerEnter={onPopupIntent}
            onMouseEnter={onPopupIntent}
            onFocus={onPopupIntent}
            onTouchStart={onPopupIntent}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100"
            tabIndex={-1}
            title="Search popup"
          >
            <Search className="h-3 w-3" />
          </button>
        ) : isDocNumberColumn ? (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              onDocNumberSearch()
            }}
            onClick={onDocNumberSearch}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400"
            tabIndex={-1}
            title="Search"
          >
            <Search className="h-3 w-3" />
          </button>
        ) : null
      ) : activeColumnId === 'CardCode' || activeColumnId === 'CardName' ? (
        <button
          type="button"
          onClick={onOpenPopup}
          onPointerEnter={onPopupIntent}
          onMouseEnter={onPopupIntent}
          onFocus={onPopupIntent}
          onTouchStart={onPopupIntent}
          className="p-1 text-zinc-400 hover:text-blue-600 transition-colors"
          tabIndex={-1}
          title="Search popup"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

type SuggestionsDropdownProps = {
  isVisible: boolean
  suggestions: LookupItem[]
  activeColumnId: string
  onSelectSuggestion: (item: LookupItem) => void
}

export function SuggestionsDropdown({
  isVisible,
  suggestions,
  activeColumnId,
  onSelectSuggestion,
}: SuggestionsDropdownProps) {
  if (!isVisible || suggestions.length === 0) return null

  return (
    <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden py-1">
      <div className="max-h-64 overflow-auto">
        {suggestions.map((item) => {
          const isNameOnly = activeColumnId === 'CardName'
          const displayValue = isNameOnly ? item.name : item.code

          return (
            <button
              key={item.code}
              type="button"
              className="group/item w-full cursor-pointer px-4 py-2 text-left transition last:border-b-0 hover:bg-zinc-50"
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onClick={() => onSelectSuggestion(item)}
            >
              <span
                className={cn(
                  'text-[13px] leading-5 transition-colors font-medium group-hover/item:text-blue-600',
                  isNameOnly ? 'text-zinc-800' : 'text-zinc-600',
                )}
              >
                {displayValue}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
