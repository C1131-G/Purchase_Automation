import { useQueryClient } from '@tanstack/react-query'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { BadgePercent, Building2, LayoutDashboard, ShoppingCart } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuCollapsible,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from '@/components/sidebar'
import { useLogout } from '@/features/auth/hooks/use-logout'
import {
  prefetchTableRouteIntent,
  type TableRoutePath,
} from '@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch'
import { cn } from '@/shared/utils/cn'
import { useAuthStore } from '@/store/auth/auth.store'
import { useSetSidebarAction, useSidebarOpen } from '@/store/sidebar/sidebar.store'

// ShellLayout: Persistent Sidebar & Header Layout with Sapphire & White theme.
export function ShellLayout() {
  const location = useLocation()
  const navigate = useNavigate()
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

  // Accordion Logic: Sync open section with current URL
  const activeSection = React.useMemo(() => {
    if (location.pathname.startsWith('/purchase')) return 'purchase'
    if (location.pathname.startsWith('/sales')) return 'sales'
    if (location.pathname.startsWith('/dashboard')) return 'dashboard'
    return 'purchase'
  }, [location.pathname])

  const [openSection, setOpenSection] = React.useState<string | null>(activeSection)

  React.useEffect(() => {
    setOpenSection(activeSection)
  }, [activeSection])

  // handleToggle: Manages unique open state for sidebar sections.
  const handleToggle = (section: string) => {
    setSidebarOpen(true)
    setOpenSection((prev) => (prev === section ? null : section))
  }

  const handleTableNavIntent = React.useCallback(
    (routePath: TableRoutePath) => {
      prefetchTableRouteIntent(queryClient, routePath)
    },
    [queryClient],
  )

  return (
    <SidebarProvider>
      {/* Premium Sapphire White Sidebar */}
      <Sidebar className={cn('border-r border-zinc-100 bg-white')} collapsible="offcanvas">
        <SidebarHeader className="p-5 border-zinc-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] cursor-pointer">
                <Building2 className="size-5" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden animate-in fade-in duration-1000">
                <span className="text-sm font-black uppercase tracking-tight text-zinc-950 leading-tight">
                  Vendor Portal
                </span>
                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-[0.2em] leading-none mt-0.5">
                  Industrial Cloud
                </span>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="pt-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Purchase Sub-menu */}
                <SidebarMenuCollapsible
                  title="Purchase"
                  icon={ShoppingCart}
                  isOpen={openSection === 'purchase'}
                  onToggle={() => handleToggle('purchase')}
                  isActive={location.pathname.startsWith('/purchase')}
                >
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/orders"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/purchase/orders')}
                      onFocus={() => handleTableNavIntent('/purchase/orders')}
                      onTouchStart={() => handleTableNavIntent('/purchase/orders')}
                      isActive={location.pathname === '/purchase/orders'}
                    >
                      Purchase Orders
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/grpo"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/purchase/grpo')}
                      onFocus={() => handleTableNavIntent('/purchase/grpo')}
                      onTouchStart={() => handleTableNavIntent('/purchase/grpo')}
                      isActive={location.pathname === '/purchase/grpo'}
                    >
                      GRPO
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/ap-invoice"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/purchase/ap-invoice')}
                      onFocus={() => handleTableNavIntent('/purchase/ap-invoice')}
                      onTouchStart={() => handleTableNavIntent('/purchase/ap-invoice')}
                      isActive={location.pathname === '/purchase/ap-invoice'}
                    >
                      A/P Invoice
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/ap-credit-note"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/purchase/ap-credit-note')}
                      onFocus={() => handleTableNavIntent('/purchase/ap-credit-note')}
                      onTouchStart={() => handleTableNavIntent('/purchase/ap-credit-note')}
                      isActive={location.pathname === '/purchase/ap-credit-note'}
                    >
                      A/P Credit Note
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/outgoing-payment"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/purchase/outgoing-payment')}
                      onFocus={() => handleTableNavIntent('/purchase/outgoing-payment')}
                      onTouchStart={() => handleTableNavIntent('/purchase/outgoing-payment')}
                      isActive={location.pathname === '/purchase/outgoing-payment'}
                    >
                      Outgoing Payment
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuCollapsible>

                {/* Sales Sub-menu */}
                <SidebarMenuCollapsible
                  title="Sales"
                  icon={BadgePercent}
                  isOpen={openSection === 'sales'}
                  onToggle={() => handleToggle('sales')}
                  isActive={location.pathname.startsWith('/sales')}
                >
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/sales/orders"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/sales/orders')}
                      onFocus={() => handleTableNavIntent('/sales/orders')}
                      onTouchStart={() => handleTableNavIntent('/sales/orders')}
                      isActive={location.pathname === '/sales/orders'}
                    >
                      Sales Orders
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/sales/ar-invoice"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/sales/ar-invoice')}
                      onFocus={() => handleTableNavIntent('/sales/ar-invoice')}
                      onTouchStart={() => handleTableNavIntent('/sales/ar-invoice')}
                      isActive={location.pathname === '/sales/ar-invoice'}
                    >
                      A/R Invoice
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/sales/ar-credit-note"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/sales/ar-credit-note')}
                      onFocus={() => handleTableNavIntent('/sales/ar-credit-note')}
                      onTouchStart={() => handleTableNavIntent('/sales/ar-credit-note')}
                      isActive={location.pathname === '/sales/ar-credit-note'}
                    >
                      A/R Credit Note
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/sales/incoming-payment"
                      search={{}}
                      onMouseEnter={() => handleTableNavIntent('/sales/incoming-payment')}
                      onFocus={() => handleTableNavIntent('/sales/incoming-payment')}
                      onTouchStart={() => handleTableNavIntent('/sales/incoming-payment')}
                      isActive={location.pathname === '/sales/incoming-payment'}
                    >
                      Incoming Payment
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuCollapsible>

                {/* Dashboard Sub-menu */}
                <SidebarMenuCollapsible
                  title="Dashboard"
                  icon={LayoutDashboard}
                  isOpen={openSection === 'dashboard'}
                  onToggle={() => handleToggle('dashboard')}
                  isActive={location.pathname.startsWith('/dashboard')}
                >
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/dashboard/purchase"
                      isActive={location.pathname === '/dashboard/purchase'}
                    >
                      Purchase
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/dashboard/sales"
                      isActive={location.pathname === '/dashboard/sales'}
                    >
                      Sales
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuCollapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-zinc-50">
          <SidebarMenu>
            <SidebarMenuItem>
              <Button
                type="button"
                onClick={() => logout()}
                isLoading={logoutBusy}
                loadingText="Logging out..."
                variant="danger"
                className="h-11 w-full rounded-xl border border-red-200 bg-red-50 text-red-700 normal-case tracking-normal shadow-[0_4px_10px_rgba(248,113,113,0.18)] hover:bg-red-100 focus:ring-red-300/40"
              >
                Log out
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Sapphire Light Workspace */}
      <SidebarInset
        className={cn(
          'bg-zinc-50 transition-[filter,opacity] duration-150',
          isSidebarOpen && 'md:pointer-events-none md:opacity-80 md:blur-[2px]',
          logoutBusy && 'pointer-events-none opacity-80 blur-[2px]',
        )}
      >
        {/* Main Body - Routed Content */}
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
