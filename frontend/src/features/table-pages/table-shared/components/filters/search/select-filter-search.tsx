import { Select } from '@/components/select/select'
import { type SelectOption } from '@/features/table-pages/table-shared/utils/table-filter-values'
import { cn } from '@/shared/utils/cn'

import { type SelectFilterSearchProps } from './table-search.types'

export function SelectFilterSearch<TData>({
  selectValue,
  filterOptions,
  onSearchChange,
  className,
}: SelectFilterSearchProps<TData>) {
  return (
    <div className={cn('relative w-full', className)}>
      <Select value={selectValue} onValueChange={onSearchChange}>
        <Select.Trigger className="w-full h-11 bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-normal">
          <Select.Value placeholder="Select Status..." />
          <Select.Icon>
            <svg
              className="size-4 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <Select.List>
                <Select.Item value="">All</Select.Item>
                {Array.isArray(filterOptions) &&
                  (filterOptions as SelectOption[]).map((option: SelectOption | string) => {
                    const value = typeof option === 'string' ? option : option.value
                    const labelText = typeof option === 'string' ? option : option.label

                    let icon = null
                    if (labelText === 'Open')
                      icon = <div className="size-2 rounded-full bg-emerald-500" />
                    if (labelText === 'Closed')
                      icon = <div className="size-2 rounded-full bg-zinc-400" />
                    if (labelText === 'Yes (Canceled)')
                      icon = (
                        <svg
                          className="size-4 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )
                    if (labelText === 'No (Active)')
                      icon = (
                        <svg
                          className="size-4 text-zinc-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )

                    return (
                      <Select.Item key={value} value={value}>
                        <div className="flex items-center gap-2">
                          {icon}
                          {labelText}
                        </div>
                      </Select.Item>
                    )
                  })}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select>
    </div>
  )
}
