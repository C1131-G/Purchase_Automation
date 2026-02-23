import { BadgePercent, LayoutDashboard, ShoppingCart } from 'lucide-react'

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuCollapsible,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/sidebar'
import { type TableRoutePath } from '@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch'

import { type SectionKey } from './shell-layout.types'

type ShellLayoutNavigationProps = {
  pathname: string
  isSectionOpen: (section: SectionKey) => boolean
  onToggleSection: (section: SectionKey) => void
  onTableNavIntent: (routePath: TableRoutePath) => void
}

export function ShellLayoutNavigation({
  pathname,
  isSectionOpen,
  onToggleSection,
  onTableNavIntent,
}: ShellLayoutNavigationProps) {
  return (
    <SidebarContent className="pt-4">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuCollapsible
              title="Purchase"
              icon={ShoppingCart}
              isOpen={isSectionOpen('purchase')}
              onToggle={() => onToggleSection('purchase')}
              isActive={pathname.startsWith('/purchase')}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/orders"
                  onMouseEnter={() => onTableNavIntent('/purchase/orders')}
                  onFocus={() => onTableNavIntent('/purchase/orders')}
                  onTouchStart={() => onTableNavIntent('/purchase/orders')}
                  isActive={pathname === '/purchase/orders'}
                >
                  Purchase Orders
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/grpo"
                  onMouseEnter={() => onTableNavIntent('/purchase/grpo')}
                  onFocus={() => onTableNavIntent('/purchase/grpo')}
                  onTouchStart={() => onTableNavIntent('/purchase/grpo')}
                  isActive={pathname === '/purchase/grpo'}
                >
                  GRPO
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/ap-invoice"
                  onMouseEnter={() => onTableNavIntent('/purchase/ap-invoice')}
                  onFocus={() => onTableNavIntent('/purchase/ap-invoice')}
                  onTouchStart={() => onTableNavIntent('/purchase/ap-invoice')}
                  isActive={pathname === '/purchase/ap-invoice'}
                >
                  A/P Invoice
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/ap-credit-note"
                  onMouseEnter={() => onTableNavIntent('/purchase/ap-credit-note')}
                  onFocus={() => onTableNavIntent('/purchase/ap-credit-note')}
                  onTouchStart={() => onTableNavIntent('/purchase/ap-credit-note')}
                  isActive={pathname === '/purchase/ap-credit-note'}
                >
                  A/P Credit Note
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/outgoing-payment"
                  onMouseEnter={() => onTableNavIntent('/purchase/outgoing-payment')}
                  onFocus={() => onTableNavIntent('/purchase/outgoing-payment')}
                  onTouchStart={() => onTableNavIntent('/purchase/outgoing-payment')}
                  isActive={pathname === '/purchase/outgoing-payment'}
                >
                  Outgoing Payment
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>

            <SidebarMenuCollapsible
              title="Sales"
              icon={BadgePercent}
              isOpen={isSectionOpen('sales')}
              onToggle={() => onToggleSection('sales')}
              isActive={pathname.startsWith('/sales')}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/orders"
                  onMouseEnter={() => onTableNavIntent('/sales/orders')}
                  onFocus={() => onTableNavIntent('/sales/orders')}
                  onTouchStart={() => onTableNavIntent('/sales/orders')}
                  isActive={pathname === '/sales/orders'}
                >
                  Sales Orders
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/ar-invoice"
                  onMouseEnter={() => onTableNavIntent('/sales/ar-invoice')}
                  onFocus={() => onTableNavIntent('/sales/ar-invoice')}
                  onTouchStart={() => onTableNavIntent('/sales/ar-invoice')}
                  isActive={pathname === '/sales/ar-invoice'}
                >
                  A/R Invoice
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/ar-credit-note"
                  onMouseEnter={() => onTableNavIntent('/sales/ar-credit-note')}
                  onFocus={() => onTableNavIntent('/sales/ar-credit-note')}
                  onTouchStart={() => onTableNavIntent('/sales/ar-credit-note')}
                  isActive={pathname === '/sales/ar-credit-note'}
                >
                  A/R Credit Note
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/incoming-payment"
                  onMouseEnter={() => onTableNavIntent('/sales/incoming-payment')}
                  onFocus={() => onTableNavIntent('/sales/incoming-payment')}
                  onTouchStart={() => onTableNavIntent('/sales/incoming-payment')}
                  isActive={pathname === '/sales/incoming-payment'}
                >
                  Incoming Payment
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>

            <SidebarMenuCollapsible
              title="Dashboard"
              icon={LayoutDashboard}
              isOpen={isSectionOpen('dashboard')}
              onToggle={() => onToggleSection('dashboard')}
              isActive={pathname.startsWith('/dashboard')}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/dashboard/purchase"
                  isActive={pathname === '/dashboard/purchase'}
                >
                  Purchase
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/dashboard/sales"
                  isActive={pathname === '/dashboard/sales'}
                >
                  Sales
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
