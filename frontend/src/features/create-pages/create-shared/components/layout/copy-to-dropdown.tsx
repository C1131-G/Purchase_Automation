import { Link } from '@tanstack/react-router'
import { ChevronUp, Copy, StickyNote, Truck } from 'lucide-react'

import { Button } from '@/components/button'
import { Popover } from '@/components/popover'
import { cn } from '@/shared/utils/cn'

interface CopyToOption {
  label: string
  to: string
  icon: React.ReactNode
}

interface CopyToDropdownProps {
  docNum: string
  sourceDocType: 'PurchaseOrder' | 'GoodsReceiptPO'
  targets: ('GRPO' | 'AP Invoice')[]
  className?: string
}

export function CopyToDropdown({ docNum, sourceDocType, targets, className }: CopyToDropdownProps) {
  const options: CopyToOption[] = targets.map((target) => {
    if (target === 'GRPO') {
      return {
        label: 'GRPO',
        to: '/purchase/create-grpo',
        icon: <Truck className="h-4 w-4" />,
      }
    }
    return {
      label: 'AP Invoice',
      to: '/purchase/create-ap-invoice',
      icon: <StickyNote className="h-4 w-4" />,
    }
  })

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            'group h-11 rounded-md border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 focus:outline-none focus:ring-0 ring-0 outline-none',
            className,
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Copy className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
            Copy To
            <ChevronUp className="h-3 w-3 text-zinc-400 group-hover:text-blue-500 transition-colors" />
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Content side="top" align="end" unstyled className="z-[1001] shadow-2xl">
        <div className="min-w-50 overflow-hidden border border-zinc-100 bg-white p-0.5 text-zinc-900 shadow-xl ring-1 ring-black/5">
          <div className="flex flex-col gap-0.5">
            {options.map((option) => (
              <Link
                key={option.label}
                to={option.to}
                search={{ sourceDocNum: docNum, sourceDocType }}
                className="group flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-blue-600"
              >
                <span className="text-zinc-400 group-hover:text-blue-500 transition-colors">
                  {option.icon}
                </span>
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}
