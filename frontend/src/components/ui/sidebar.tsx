import { Link } from '@tanstack/react-router'
import { ChevronRight, PanelLeftIcon } from 'lucide-react'
import React from 'react'

import { cn } from '@/shared/utils/cn'
import {
  useSetSidebarAction,
  useSidebarOpen,
  useToggleSidebarAction,
} from '@/store/sidebar/sidebar.store'

const SIDEBAR_WIDTH = '16rem'
const SIDEBAR_WIDTH_ICON = '3rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

/**
 * Sidebar: Persistent application navigation architecture.
 *
 * DESIGN: Multi-state (expanded/collapsed/offcanvas) with industrial fluid transitions.
 * UX: Modern "Control+B" keyboard shortcut and interactive hover highlights.
 * ARCHITECTURE: Composite structure (Header, Content, Menu, Footer) for scalable ERP navigation.
 */
export function SidebarProvider({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const toggleSidebar = useToggleSidebarAction()
  const open = useSidebarOpen()
  const setOpen = useSetSidebarAction()

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen, toggleSidebar])

  return (
    <div
      style={
        {
          '--sidebar-width': SIDEBAR_WIDTH,
          '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        'group/sidebar-wrapper flex min-h-screen w-full transition-all duration-500 ease-in-out',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
}) {
  const open = useSidebarOpen()
  const setOpen = useSetSidebarAction()
  const state = open ? 'expanded' : 'collapsed'
  const resolvedWidth =
    state === 'collapsed'
      ? collapsible === 'offcanvas'
        ? '0'
        : collapsible === 'icon'
          ? 'var(--sidebar-width-icon)'
          : 'var(--sidebar-width)'
      : 'var(--sidebar-width)'

  if (collapsible === 'none') {
    return (
      <div
        className={cn(
          'bg-white border-r border-zinc-100 flex h-full w-(--sidebar-width) flex-col',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <>
      {collapsible === 'offcanvas' && open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-[110] hidden bg-zinc-950/12 md:block"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        style={
          {
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            width: resolvedWidth,
          } as React.CSSProperties
        }
        className={cn(
          'group hidden md:block fixed left-0 top-0 transition-all duration-500 bg-white border-zinc-100 border-r overflow-hidden h-screen z-[120]',
          state === 'collapsed' && collapsible === 'offcanvas' && 'border-r-0!',
          className,
        )}
        data-state={state}
        data-collapsible={collapsible}
        data-variant={variant}
        data-side={side}
        {...props}
      >
        <div
          style={
            {
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              width: 'var(--sidebar-width)',
            } as React.CSSProperties
          }
          className={cn(
            'flex h-full flex-col transition-opacity duration-200',
            state === 'collapsed' && collapsible === 'offcanvas' ? 'opacity-0' : 'opacity-100',
          )}
        >
          {children}
        </div>
      </div>
    </>
  )
}

export function SidebarTrigger({
  className,
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const toggleSidebar = useToggleSidebarAction()

  return (
    <button
      className={cn(
        'group inline-flex items-center justify-center rounded-xl p-2.5 text-zinc-400 hover:text-blue-600 focus-visible:outline-none focus:ring-0 transition-all duration-300 cursor-pointer border-none bg-transparent',
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      {children || (
        <PanelLeftIcon className="size-5 transition-transform duration-300 group-hover:-translate-x-0.5 group-active:scale-95" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  const open = useSidebarOpen()

  return (
    <main
      className={cn(
        'bg-zinc-50 relative z-0 flex min-w-0 flex-1 flex-col transition-all duration-500 ease-in-out',
        open && 'md:blur-[2px] md:saturate-75',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('gap-2 p-4 flex flex-col border-b border-zinc-50', className)} {...props} />
  )
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('gap-2 p-4 flex flex-col border-t border-zinc-50 mt-auto w-full', className)}
      {...props}
    />
  )
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex-1 flex flex-col overflow-y-auto no-scrollbar', className)}
      {...props}
    />
  )
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-2 relative flex w-full min-w-0 flex-col', className)} {...props} />
}

export function SidebarGroupLabel({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-zinc-300 h-8 px-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center shrink-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm w-full space-y-1', className)} {...props} />
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li className={cn('relative px-2', className)} {...props} />
}

export function SidebarMenuButton({
  isActive = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-xl p-2.5 text-sm font-semibold transition-all duration-300 cursor-pointer',
        'hover:bg-blue-50 hover:text-blue-600 text-zinc-500',
        isActive && 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]',
        'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarMenuCollapsible({
  children,
  title,
  icon: Icon,
  isActive = false,
  isOpen = false,
  onToggle,
}: {
  children: React.ReactNode
  title: string
  icon: React.ElementType
  isActive?: boolean
  isOpen?: boolean
  onToggle?: () => void
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onToggle}
        isActive={isActive}
        className="justify-between group/trigger"
      >
        <div className="flex items-center gap-3">
          <Icon className="size-4" />
          <span>{title}</span>
        </div>
        <ChevronRight
          className={cn(
            'size-3.5 transition-transform duration-300 text-zinc-300 group-hover/trigger:text-blue-600',
            isOpen && 'rotate-90',
            isActive && 'text-white group-hover/trigger:text-white',
          )}
        />
      </SidebarMenuButton>
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 overflow-hidden',
        )}
      >
        <div className="min-h-0">
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </div>
      </div>
    </SidebarMenuItem>
  )
}

export function SidebarSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('bg-zinc-50 h-px mx-4 my-2', className)} {...props} />
}

export function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'ml-8 space-y-1 border-l border-zinc-200 pl-4 group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarMenuSubItem({ ...props }: React.ComponentProps<'li'>) {
  return <li {...props} />
}

export function SidebarMenuSubButton({
  isActive = false,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { isActive?: boolean; children: React.ReactNode }) {
  const setOpen = useSetSidebarAction()

  return (
    <Link
      preload="intent"
      className={cn(
        'relative flex w-full items-center text-[13px] py-1.5 text-zinc-400 hover:text-blue-600 transition-all duration-300 text-left cursor-pointer bg-transparent',
        isActive && 'text-blue-600 font-bold',
        className,
      )}
      onClick={() => {
        setOpen(false)
      }}
      {...props}
    >
      {isActive && (
        <div className="absolute -left-4.25 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-600 rounded-full animate-in slide-in-from-left-1 duration-300" />
      )}
      {children}
    </Link>
  )
}
