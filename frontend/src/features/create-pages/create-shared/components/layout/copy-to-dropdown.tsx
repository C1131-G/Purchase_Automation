import { Link } from '@tanstack/react-router'
import { ChevronDown, Copy, StickyNote, Truck } from 'lucide-react'

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
  sourceDocType: 'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice'
  targets: ('GRPO' | 'AP Invoice' | 'AP Credit Note')[]
  className?: string
}

export function CopyToDropdown({ docNum, sourceDocType, targets, className }: CopyToDropdownProps) {
  const options: CopyToOption[] = targets.map((target) => ({
    label: target === 'GRPO' ? 'GRPO' : target === 'AP Invoice' ? 'AP Invoice' : 'AP Credit Note',
    to:
      target === 'GRPO'
        ? '/purchase/create-grpo'
        : target === 'AP Invoice'
          ? '/purchase/create-ap-invoice'
          : '/purchase/create-ap-credit-note',
    icon:
      target === 'GRPO' ? (
        <Truck className="h-3.5 w-3.5" />
      ) : target === 'AP Invoice' ? (
        <StickyNote className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      ),
  }))

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          size="md"
          variant="outline"
          className={cn(
            'group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none',
            className,
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Copy className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            <span>Copy To</span>
            <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Content side="top" align="end" unstyled className="z-[1001]">
        <div className="min-w-[160px] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-zinc-900 shadow-lg ring-1 ring-black/5">
          <div className="flex flex-col">
            {options.map((option) => (
              <Link
                key={option.label}
                to={option.to}
                search={{ sourceDocNum: docNum, sourceDocType }}
                className="group flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <span className="text-zinc-400 group-hover:text-zinc-600 transition-colors">
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
