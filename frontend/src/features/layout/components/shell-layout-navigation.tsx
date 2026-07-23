import React from "react";
import { BadgePercent, LayoutDashboard, ShoppingCart } from "lucide-react";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuCollapsible,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/sidebar";
import type { TableRoutePath } from "@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch";
import { markSidebarNavigation } from "@/shared/utils/route-transition";

import type { SectionKey } from "../utils/shell-layout.types";

interface ShellLayoutNavigationProps {
  pathname: string;
  isSectionOpen: (section: SectionKey) => boolean;
  onToggleSection: (section: SectionKey) => void;
  onTableNavIntent: (routePath: TableRoutePath) => void;
}

export function ShellLayoutNavigation({
  pathname,
  isSectionOpen,
  onToggleSection,
  onTableNavIntent,
}: ShellLayoutNavigationProps) {
  const handleSidebarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a")) {
      markSidebarNavigation();
    }
  };

  return (
    <SidebarContent className="pt-4" onClick={handleSidebarClick}>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuCollapsible
              title="Dashboard"
              icon={LayoutDashboard}
              isOpen={isSectionOpen("dashboard")}
              onToggle={() => onToggleSection("dashboard")}
              isActive={pathname.startsWith("/dashboard")}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/dashboard/purchase"
                  search={{ period: "week" } as any}
                  isActive={pathname === "/dashboard/purchase"}
                >
                  Purchase
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/dashboard/sales"
                  search={{ period: "week" } as any}
                  isActive={pathname === "/dashboard/sales"}
                >
                  Sales
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>
            <SidebarMenuCollapsible
              title="Purchase"
              icon={ShoppingCart}
              isOpen={isSectionOpen("purchase")}
              onToggle={() => onToggleSection("purchase")}
              isActive={pathname.startsWith("/purchase")}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/create-quotation"
                  onMouseEnter={() => onTableNavIntent("/purchase/quotations")}
                  onFocus={() => onTableNavIntent("/purchase/quotations")}
                  onTouchStart={() => onTableNavIntent("/purchase/quotations")}
                  isActive={
                    pathname === "/purchase/create-quotation" ||
                    pathname === "/purchase/quotations" ||
                    pathname.startsWith("/purchase/quotations/")
                  }
                >
                  Purchase Quotations
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/create-order"
                  onMouseEnter={() => onTableNavIntent("/purchase/orders")}
                  onFocus={() => onTableNavIntent("/purchase/orders")}
                  onTouchStart={() => onTableNavIntent("/purchase/orders")}
                  isActive={
                    pathname === "/purchase/create-order" ||
                    pathname === "/purchase/orders" ||
                    pathname.startsWith("/purchase/orders/")
                  }
                >
                  Purchase Orders
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/create-grpo"
                  onMouseEnter={() => onTableNavIntent("/purchase/grpo")}
                  onFocus={() => onTableNavIntent("/purchase/grpo")}
                  onTouchStart={() => onTableNavIntent("/purchase/grpo")}
                  isActive={
                    pathname === "/purchase/create-grpo" ||
                    pathname === "/purchase/grpo" ||
                    pathname.startsWith("/purchase/grpo/")
                  }
                >
                  GRPO
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/create-ap-invoice"
                  onMouseEnter={() => onTableNavIntent("/purchase/ap-invoice")}
                  onFocus={() => onTableNavIntent("/purchase/ap-invoice")}
                  onTouchStart={() => onTableNavIntent("/purchase/ap-invoice")}
                  isActive={
                    pathname === "/purchase/create-ap-invoice" ||
                    pathname === "/purchase/ap-invoice" ||
                    pathname.startsWith("/purchase/ap-invoice/")
                  }
                >
                  A/P Invoice
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/create-ap-credit-memo"
                  onMouseEnter={() => onTableNavIntent("/purchase/ap-credit-memo")}
                  onFocus={() => onTableNavIntent("/purchase/ap-credit-memo")}
                  onTouchStart={() => onTableNavIntent("/purchase/ap-credit-memo")}
                  isActive={
                    pathname === "/purchase/create-ap-credit-memo" ||
                    pathname === "/purchase/ap-credit-memo" ||
                    pathname.startsWith("/purchase/ap-credit-memo/")
                  }
                >
                  A/P Credit Memo
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/purchase/create-outgoing-payment"
                  onMouseEnter={() => onTableNavIntent("/purchase/outgoing-payment")}
                  onFocus={() => onTableNavIntent("/purchase/outgoing-payment")}
                  onTouchStart={() => onTableNavIntent("/purchase/outgoing-payment")}
                  isActive={
                    pathname === "/purchase/create-outgoing-payment" ||
                    pathname === "/purchase/outgoing-payment" ||
                    pathname.startsWith("/purchase/outgoing-payment/")
                  }
                >
                  Outgoing Payment
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>

            <SidebarMenuCollapsible
              title="Sales"
              icon={BadgePercent}
              isOpen={isSectionOpen("sales")}
              onToggle={() => onToggleSection("sales")}
              isActive={pathname.startsWith("/sales")}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/create-quotation"
                  onMouseEnter={() => onTableNavIntent("/sales/quotations")}
                  onFocus={() => onTableNavIntent("/sales/quotations")}
                  onTouchStart={() => onTableNavIntent("/sales/quotations")}
                  isActive={
                    pathname === "/sales/create-quotation" ||
                    pathname === "/sales/quotations" ||
                    pathname.startsWith("/sales/quotations/")
                  }
                >
                  Sales Quotations
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
