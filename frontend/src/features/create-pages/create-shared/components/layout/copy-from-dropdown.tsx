import { ChevronDown, Copy } from 'lucide-react'

import { Button } from '@/components/button'
import { cn } from '@/shared/utils/cn'

interface CopyFromDropdownProps {
  vendorCode?: string
  vendorName?: string
  disabled?: boolean
  onClick?: () => void
  className?: string
}

export function CopyFromDropdown({
  vendorCode,
  vendorName,
  disabled = false,
  onClick,
  className,
}: CopyFromDropdownProps) {
  const isVendorSelected = Boolean(vendorCode?.trim() && vendorName?.trim())
  const isDisabled = disabled || !isVendorSelected

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'group h-8 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus:ring-0 ring-0 outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Copy className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
        <span>Copy From</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 transition-transform duration-200" />
      </span>
    </Button>
  )
}
