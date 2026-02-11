import * as React from "react"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"

export interface AlertDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

export const AlertDialog = ({ open, children }: AlertDialogProps) => {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" />
            <div className="relative z-50 w-full max-w-md scale-100 opacity-100 animate-in zoom-in-95 duration-200">
                {children}
            </div>
        </div>
    )
}

export const AlertDialogContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6",
            className
        )}
        {...props}
    />
)

export const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("space-y-2 mb-6", className)} {...props} />
)

export const AlertDialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={cn("text-xl font-bold text-slate-900 dark:text-white leading-none", className)} {...props} />
)

export const AlertDialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />
)

export const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex justify-end gap-3", className)} {...props} />
)

export const AlertDialogAction = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
    <Button className={cn("rounded-lg px-6", className)} {...props} />
)
