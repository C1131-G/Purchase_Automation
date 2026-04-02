import { Link } from '@tanstack/react-router'
import { ChevronDown, Copy, StickyNote, Truck } from 'lucide-react'

import { Button } from '@/components/button'
import { Popover } from '@/components/popover'
import { cn } from '@/shared/utils/cn'

interface CopyToOption {
  label: string
  to: string
  icon: React.ReactNode
  disabled?: boolean
  disabledReason?: string
}

interface CopyToDropdownProps {
  docNum: string
  sourceDocType: 'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice'
  targets: ('GRPO' | 'AP Invoice' | 'AP Credit Note')[]
  docStatus?: 'Open' | 'Partial' | 'Closed'
  className?: string
}

export function CopyToDropdown({
  docNum,
  sourceDocType,
  targets,
  docStatus = 'Open',
  className,
}: CopyToDropdownProps) {
  // Partial-status rules: restrict copy targets based on document status and type
  const getValidTargets = () => {
    // Closed documents cannot be copied from
    if (docStatus === 'Closed') {
      return []
    }

    // For Partial documents, only allow the next logical document in the chain
    if (docStatus === 'Partial') {
      if (sourceDocType === 'PurchaseOrder') {
        // PO Partial: could be inventory (→ GRPO) or service (→ AP Invoice)
        // For now, allow both - backend will validate based on item type
        return targets.filter((t) => t === 'GRPO' || t === 'AP Invoice')
      }
      if (sourceDocType === 'GoodsReceiptPO') {
        // GRPO Partial → AP Invoice only
        return targets.filter((t) => t === 'AP Invoice')
      }
      if (sourceDocType === 'APInvoice') {
        // AP Invoice Partial → AP Credit Note or Outgoing Payment
        // Outgoing Payment not yet implemented, so only AP Credit Note
        return targets.filter((t) => t === 'AP Credit Note')
      }
    }

    // Open documents can use all specified targets
    return targets
  }

  const validTargets = getValidTargets()

  const options: CopyToOption[] = targets.map((target) => {
    const isValid = validTargets.includes(target)
    const isPartialRestricted = !isValid && docStatus === 'Partial'

    const baseOption = {
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
    }

    if (isPartialRestricted) {
      return {
        ...baseOption,
        disabled: true,
        disabledReason:
          target === 'GRPO'
            ? 'Partial PO can only copy to GRPO for inventory items'
            : target === 'AP Invoice'
              ? 'Partial document can only copy to AP Invoice'
              : 'Partial AP Invoice can only copy to AP Credit Note',
      }
    }

    return baseOption
  })

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            'group h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus:ring-0 ring-0 outline-none',
            className,
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            <span>Copy To</span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Content side="top" align="end" unstyled className="z-[1001]">
        <div className="min-w-[160px] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-zinc-900 shadow-lg ring-1 ring-black/5">
          <div className="flex flex-col">
            {options.map((option) => {
              if (option.disabled) {
                return (
                  <div
                    key={option.label}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 cursor-not-allowed"
                  >
                    <span className="text-zinc-300">{option.icon}</span>
                    {option.label}
                    {option.disabledReason && (
                      <span className="ml-auto text-[10px] text-zinc-400 italic max-w-[120px] truncate">
                        {option.disabledReason}
                      </span>
                    )}
                  </div>
                )
              }

              return (
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
              )
            })}
          </div>
          {docStatus === 'Partial' && (
            <div className="mt-0.5 border-t border-zinc-100 pt-1.5 px-3 pb-1">
              <p className="text-[10px] text-amber-600 font-medium leading-tight">
                Partial document - only next step allowed
              </p>
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}
