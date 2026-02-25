import { useQueryClient } from '@tanstack/react-query'
import { Outlet, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import React from 'react'

import { Sidebar, SidebarInset, SidebarProvider } from '@/components/sidebar'
import { useLogout } from '@/features/auth/hooks/use-logout'
import {
  prefetchTableRouteIntent,
  type TableRoutePath,
} from '@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch'
import { cn } from '@/shared/utils/cn'
import { useAuthStore } from '@/store/auth/auth.store'
import { useSetSidebarAction, useSidebarOpen } from '@/store/sidebar/sidebar.store'

import { type SectionKey } from '../utils/shell-layout.types'
import { ShellLayoutBrandHeader } from './shell-layout-brand-header'
import { ShellLayoutLogout } from './shell-layout-logout'
import { ShellLayoutNavigation } from './shell-layout-navigation'

// ShellLayout: Persistent Sidebar & Header Layout with Sapphire & White theme.
export function ShellLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { mutate: logout, isPending: isLoggingOut } = useLogout()
  const isAuthLoading = useAuthStore((state) => state.isLoading)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logoutReason = useAuthStore((state) => state.logoutReason)
  const isSidebarOpen = useSidebarOpen()
  const setSidebarOpen = useSetSidebarAction()
  const logoutBusy = isLoggingOut || isAuthLoading

  React.useEffect(() => {
    if (isAuthenticated || isAuthLoading) return

    if (logoutReason === 'session_ended') {
      void navigate({
        to: '/login',
        search: { reason: 'session_ended' },
        replace: true,
      })
      return
    }

    if (logoutReason === 'user') {
      void navigate({
        to: '/login',
        search: { reason: 'logged_out' },
        replace: true,
      })
      return
    }

    void navigate({ to: '/login', replace: true })
  }, [isAuthenticated, isAuthLoading, logoutReason, navigate])

  // Accordion Logic: current section from URL.
  const activeSection = React.useMemo<SectionKey>(() => {
    if (location.pathname.startsWith('/purchase')) return 'purchase'
    if (location.pathname.startsWith('/sales')) return 'sales'
    if (location.pathname.startsWith('/dashboard')) return 'dashboard'
    return 'purchase'
  }, [location.pathname])

  const [expandedSectionOverride, setExpandedSectionOverride] = React.useState<
    SectionKey | null | undefined
  >(undefined)
  const transitionTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [])

  const isSectionOpen = React.useCallback(
    (section: SectionKey) => {
      if (expandedSectionOverride === undefined) return activeSection === section
      if (expandedSectionOverride === null) return false
      return expandedSectionOverride === section
    },
    [activeSection, expandedSectionOverride],
  )

  // Accordion behavior: ensure current section closes before opening next one for smooth transitions.
  const handleToggle = React.useCallback(
    (section: SectionKey) => {
      setSidebarOpen(true)

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
        transitionTimeoutRef.current = null
      }

      const currentlyEffective =
        expandedSectionOverride === undefined ? activeSection : expandedSectionOverride
      const isClosing = currentlyEffective === section

      if (isClosing) {
        setExpandedSectionOverride(null)
        return
      }

      // If another section is open, close it first then wait before opening new one
      if (currentlyEffective !== null) {
        setExpandedSectionOverride(null)
        transitionTimeoutRef.current = setTimeout(() => {
          setExpandedSectionOverride(section)
          transitionTimeoutRef.current = null
        }, 300) // Matches SidebarMenuCollapsible transition duration
      } else {
        setExpandedSectionOverride(section)
      }
    },
    [activeSection, expandedSectionOverride, setSidebarOpen],
  )

  const handleTableNavIntent = React.useCallback(
    (routePath: TableRoutePath) => {
      void router.preloadRoute({ to: routePath as never })
      prefetchTableRouteIntent(queryClient, routePath)
    },
    [queryClient, router],
  )

  return (
    <SidebarProvider>
      <Sidebar className={cn('border-r border-zinc-100 bg-white')} collapsible="offcanvas">
        <ShellLayoutBrandHeader />
        <ShellLayoutNavigation
          pathname={location.pathname}
          isSectionOpen={isSectionOpen}
          onToggleSection={handleToggle}
          onTableNavIntent={handleTableNavIntent}
        />
        <ShellLayoutLogout logoutBusy={logoutBusy} onLogout={() => logout()} />
      </Sidebar>

      <SidebarInset
        className={cn(
          'bg-zinc-50 transition-[filter,opacity] duration-150',
          isSidebarOpen && 'md:opacity-80 md:blur-[2px]',
          logoutBusy && 'pointer-events-none opacity-80 blur-[2px]',
        )}
      >
        <main className="flex-1 p-0 overflow-hidden">
          <div
            className="h-full w-full"
            style={{ viewTransitionName: 'tab-content' } as React.CSSProperties}
          >
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
