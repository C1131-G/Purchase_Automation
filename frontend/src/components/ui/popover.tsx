import React, { useEffect, useRef, useState } from 'react'

import { PopoverContext, usePopover } from '@/components/ui/context/popover-context'
import { cn } from '@/utils/cn'
import { MOTION_EASING, MOTION_MS } from '@/utils/motion'

/**
 * Popover: Floating industrial utility container.
 * 
 * DESIGN: High-elevation shadow (XL) with a subtle zinc-100 border.
 * LOGIC: Context-driven visibility with dedicated entry/exit animation timings.
 * UX: Automatic "click outside" dismissal and precise alignment (start/center/end).
 */
export function PopoverRoot({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return

      const target = event.target as Node
      const clickedTrigger = triggerRef.current?.contains(target)
      const clickedContent = contentRef.current?.contains(target)

      if (!clickedTrigger && !clickedContent) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function PopoverTrigger({
  children,
  className,
  asChild = false,
  ...props
}: PopoverTriggerProps) {
  const { open, setOpen, triggerRef } = usePopover()

  if (asChild && React.isValidElement(children)) {
    const childrenProps = children.props as any
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        childrenProps.onClick?.(e)
        if (e.defaultPrevented) return
        setOpen(!open)
      },
      ...props,
    })
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={(e) => {
        if (e.defaultPrevented) return
        setOpen(!open)
      }}
      className={cn('active:scale-[0.95] transition-transform', className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function PopoverContent({
  children,
  className,
  side = 'bottom',
  align = 'end',
  unstyled = false,
}: {
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  unstyled?: boolean
}) {
  const { open, contentRef } = usePopover()
  const [isVisible, setIsVisible] = React.useState(false) // Controls render
  const [isAnimating, setIsAnimating] = React.useState(false) // Controls class

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      // Double RAF for smoother entry
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true))
      })
    } else {
      setIsAnimating(false)
      // Slightly faster close for snappier feel
      const timer = setTimeout(() => setIsVisible(false), MOTION_MS.popoverExit)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!isVisible) return null

  return (
    <div
      ref={contentRef}
      data-popover-content
      className={cn(
        'absolute z-[999] pointer-events-auto',
        // Smooth, industry-standard easing with faster close
        'transition-all ease-out',
        isAnimating
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-[0.97] -translate-y-1', // Subtle scale + upward motion on close
        side === 'bottom' ? 'mt-2 top-full' : 'mb-2 bottom-full',
        align === 'start' && 'left-0 origin-top-left',
        align === 'center' && 'left-1/2 -translate-x-1/2 origin-top',
        align === 'end' && 'right-0 origin-top-right',
        className,
      )}
      style={{
        transitionDuration: `${isAnimating ? MOTION_MS.popoverEnter : MOTION_MS.popoverExit}ms`,
        transitionTimingFunction: MOTION_EASING.smoothOut,
      }}
    >
      {unstyled ? (
        children
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white text-zinc-900 shadow-xl ring-1 ring-black/5 min-w-[200px]">
          {children}
        </div>
      )}
    </div>
  )
}

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
}
