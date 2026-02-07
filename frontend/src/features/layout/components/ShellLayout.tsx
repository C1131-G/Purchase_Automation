import { Outlet, useLocation } from '@tanstack/react-router'
import { BadgePercent, Building2, LayoutDashboard, ShoppingCart } from 'lucide-react'
import React from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuCollapsible,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from '@/components/ui/sidebar'

/**
 * ShellLayout Component.
 *
 * Persistent Sidebar & Header Layout.
 * - Manages Accordion Navigation.
 * - Sapphire & White Theme.
 */
export function ShellLayout() {
  const location = useLocation()

  // Accordion Logic: Sync open section with current URL
  const getInitialSection = () => {
    if (location.pathname.startsWith('/purchase')) return 'purchase'
    if (location.pathname.startsWith('/sales')) return 'sales'
    if (location.pathname.startsWith('/dashboard')) return 'dashboard'
    return 'purchase'
  }

  const [openSection, setOpenSection] = React.useState<string | null>(getInitialSection())

  /** Toggle logic for unique open state */
  const handleToggle = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section))
  }

  return (
    <SidebarProvider>
      {/* Premium Sapphire White Sidebar */}
      <Sidebar className="border-r border-zinc-100 bg-white" collapsible="offcanvas">
        <SidebarHeader className="p-5 border-zinc-50">
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
                      isActive={location.pathname === '/purchase/orders'}
                    >
                      Purchase Orders
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/grpo"
                      isActive={location.pathname === '/purchase/grpo'}
                    >
                      GRPO
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/ap-invoice"
                      isActive={location.pathname === '/purchase/ap-invoice'}
                    >
                      A/P Invoice
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/ap-credit-note"
                      isActive={location.pathname === '/purchase/ap-credit-note'}
                    >
                      A/P Credit Note
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/purchase/outgoing-payment"
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
                      isActive={location.pathname === '/sales/orders'}
                    >
                      Sales Orders
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/sales/ar-invoice"
                      isActive={location.pathname === '/sales/ar-invoice'}
                    >
                      A/R Invoice
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/sales/ar-credit-note"
                      isActive={location.pathname === '/sales/ar-credit-note'}
                    >
                      A/R Credit Note
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      to="/sales/incoming-payment"
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
      </Sidebar>

      {/* Sapphire Light Workspace */}
      <SidebarInset className="bg-zinc-50">
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
