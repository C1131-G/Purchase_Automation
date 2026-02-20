import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { TooltipProps } from '@/components/types/tooltip.types'
import { cn } from '@/shared/utils/cn'

const getDocument = (node: HTMLElement | null) => node?.ownerDocument ?? document

export const Tooltip = ({ children, content, className, contentClassName }: TooltipProps) => {
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  useEffect(() => {
    if (anchorRef.current) {
      setContainer(getDocument(anchorRef.current).body)
    }
  }, [])

  const updatePosition = () => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPosition({ left: rect.left, top: rect.bottom + 6 })
  }

  useEffect(() => {
    if (!isVisible) return
    updatePosition()
    const handleScroll = () => updatePosition()
    const handleResize = () => updatePosition()
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isVisible, content])

  return (
    <span
      ref={anchorRef}
      className={cn('relative block w-full max-w-full', className)}
      onFocus={() => {
        updatePosition()
        setIsVisible(true)
      }}
      onBlur={() => setIsVisible(false)}
      onMouseEnter={() => {
        updatePosition()
        setIsVisible(true)
      }}
      onMouseLeave={() => setIsVisible(false)}
      onPointerEnter={() => {
        updatePosition()
        setIsVisible(true)
      }}
      onPointerLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && container
        ? createPortal(
            <span
              className={cn(
                'pointer-events-none fixed z-999999 max-w-[320px] rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-zinc-700 shadow-[0_8px_24px_rgba(24,24,27,0.12)] backdrop-blur-md opacity-100',
                contentClassName,
              )}
              style={{ left: position.left, top: position.top }}
            >
              {content}
            </span>,
            container,
          )
        : null}
    </span>
  )
}
