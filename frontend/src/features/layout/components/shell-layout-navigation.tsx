import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, BadgePercent, LayoutDashboard, ShoppingCart } from "lucide-react";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuCollapsible,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/sidebar";
import {
  IcIntercompanySectionBadges,
  IcRetryCountPill,
  IcUnreadCountPill,
  IcUnreadIconBadge,
} from "@/features/intercompany/components/ic-unread-badge";
import type { TableRoutePath } from "@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch";
import { cn } from "@/shared/utils/cn";
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
            <SidebarMenuItem>
              <Link
                to="/dashboard"
                preload="intent"
                viewTransition
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 cursor-pointer",
                  "hover:bg-blue-50 hover:text-blue-600 text-zinc-500",
                  pathname.startsWith("/dashboard") &&
                    "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]",
                  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto",
                )}
                aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
              >
                <LayoutDashboard className="size-5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
              </Link>
            </SidebarMenuItem>
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
                  to="/sales/request-for-quotations"
                  search={{ limit: 10, page: 1 } as never}
                  isActive={
                    pathname === "/sales/request-for-quotations" ||
                    pathname.startsWith("/sales/request-for-quotations/")
                  }
                >
                  Request For Quotation
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
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

            <SidebarMenuCollapsible
              title="Intercompany"
              icon={ArrowLeftRight}
              isOpen={isSectionOpen("intercompany")}
              onToggle={() => onToggleSection("intercompany")}
              isActive={pathname.startsWith("/intercompany")}
              trailing={<IcIntercompanySectionBadges />}
              iconBadge={<IcUnreadIconBadge />}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/intercompany/notifications"
                  search={{ isRead: "all", limit: 10, page: 1 } as any}
                  isActive={
                    pathname === "/intercompany/notifications" ||
                    pathname === "/intercompany" ||
                    pathname === "/intercompany/"
                  }
                  className="justify-between gap-2 pr-1"
                >
                  <span>Notifications</span>
                  <IcUnreadCountPill />
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/intercompany/retries"
                  search={{ limit: 10, page: 1, status: "all" } as any}
                  isActive={pathname === "/intercompany/retries"}
                  className="justify-between gap-2 pr-1"
                >
                  <span>Retries</span>
                  <IcRetryCountPill />
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
