import * as React from 'react'

import { cn } from '@/shared/utils/cn'

export type SeparatorProps = React.ComponentPropsWithoutRef<'div'> & {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

/**
 * Separator: Surgical layout divider.
 * ARCHITECTURE: Supports both horizontal and vertical orientations for grid/flex control.
 */
const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-zinc-200',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  ),
)
Separator.displayName = 'Separator'

export { Separator }
