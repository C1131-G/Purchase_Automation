import { type ReactNode, useEffect } from 'react'

import {
  CREATE_MODAL_MOTION_MS,
  CREATE_MODAL_OVERLAY_CLASS,
  CREATE_MODAL_PANEL_CLASS,
} from '@/features/create-pages/create-shared/config/create-ui.constants'
import { cn } from '@/shared/utils/cn'

type AnimatedModalShellProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  panelClassName?: string
  onAfterClose?: (() => void) | undefined
}

export function AnimatedModalShell({
  open,
  onClose,
  children,
  panelClassName,
  onAfterClose,
}: AnimatedModalShellProps) {
  useEffect(() => {
    if (open || !onAfterClose) return
    const timeout = window.setTimeout(() => {
      onAfterClose?.()
    }, CREATE_MODAL_MOTION_MS)
    return () => window.clearTimeout(timeout)
  }, [open, onAfterClose])

  return (
    <div
      className={cn(
        CREATE_MODAL_OVERLAY_CLASS,
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 z-0 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10',
          CREATE_MODAL_PANEL_CLASS,
          panelClassName,
          open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}
