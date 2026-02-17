import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/shared/utils/cn'

export interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export const AlertDialog = ({ open, children }: AlertDialogProps) => {
  const [shouldRender, setShouldRender] = React.useState(open)

  React.useEffect(() => {
    if (open) {
      setShouldRender(true)
    }
  }, [open])

  const handleTransitionEnd = () => {
    if (!open) {
      setShouldRender(false)
    }
  }

  if (!shouldRender) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 pointer-events-none">
      <div
        className={cn(
          'fixed inset-0 bg-zinc-950/20 backdrop-blur-xl transition-opacity duration-1000 ease-in-out pointer-events-auto',
          open ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden="true"
      />
      <div
        onTransitionEnd={handleTransitionEnd}
        className={cn(
          'relative z-101 w-full max-w-[320px] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
          open ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export const AlertDialogContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'bg-white/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden border border-white/40 p-10 text-center',
      className,
    )}
    {...props}
  />
)

export const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col items-center gap-3 text-center', className)} {...props} />
)

export const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-[17px] font-bold tracking-tight text-black leading-tight', className)}
    {...props}
  >
    {children || 'Alert Dialog'}
  </h2>
))
AlertDialogTitle.displayName = 'AlertDialogTitle'

export const AlertDialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn('text-[13px] font-medium text-zinc-500/90 leading-relaxed', className)}
    {...props}
  />
)

export const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-8 flex flex-col gap-2 w-full', className)} {...props} />
)

export const AlertDialogAction = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button
    className={cn(
      'rounded-2xl h-11 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-sm active:scale-[0.96] active:brightness-90 transition-all duration-300 ease-out',
      className,
    )}
    {...props}
  />
)
