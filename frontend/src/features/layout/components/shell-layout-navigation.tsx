import React from "react";
import { BadgePercent, Boxes, LayoutDashboard, ShoppingCart } from "lucide-react";

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
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/dashboard/inventory"
                  search={{ period: "week" } as any}
                  isActive={pathname === "/dashboard/inventory"}
                >
                  Inventory
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
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/create-order"
                  onMouseEnter={() => onTableNavIntent("/sales/orders")}
                  onFocus={() => onTableNavIntent("/sales/orders")}
                  onTouchStart={() => onTableNavIntent("/sales/orders")}
                  isActive={
                    pathname === "/sales/create-order" ||
                    pathname === "/sales/orders" ||
                    pathname.startsWith("/sales/orders/")
                  }
                >
                  Sales Orders
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/create-ar-invoice"
                  onMouseEnter={() => onTableNavIntent("/sales/ar-invoice")}
                  onFocus={() => onTableNavIntent("/sales/ar-invoice")}
                  onTouchStart={() => onTableNavIntent("/sales/ar-invoice")}
                  isActive={
                    pathname === "/sales/create-ar-invoice" ||
                    pathname === "/sales/ar-invoice" ||
                    pathname.startsWith("/sales/ar-invoice/")
                  }
                >
                  A/R Invoice
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/ar-credit-memo/create"
                  onMouseEnter={() => onTableNavIntent("/sales/ar-credit-memo")}
                  onFocus={() => onTableNavIntent("/sales/ar-credit-memo")}
                  onTouchStart={() => onTableNavIntent("/sales/ar-credit-memo")}
                  isActive={
                    pathname === "/sales/ar-credit-memo/create" ||
                    pathname === "/sales/ar-credit-memo" ||
                    pathname.startsWith("/sales/ar-credit-memo/")
                  }
                >
                  A/R Credit Memo
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/sales/create-incoming-payment"
                  onMouseEnter={() => onTableNavIntent("/sales/incoming-payment")}
                  onFocus={() => onTableNavIntent("/sales/incoming-payment")}
                  onTouchStart={() => onTableNavIntent("/sales/incoming-payment")}
                  isActive={
                    pathname === "/sales/create-incoming-payment" ||
                    pathname === "/sales/incoming-payment" ||
                    pathname.startsWith("/sales/incoming-payment/")
                  }
                >
                  Incoming Payment
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>

            <SidebarMenuCollapsible
              title="Inventory"
              icon={Boxes}
              isOpen={isSectionOpen("inventory")}
              onToggle={() => onToggleSection("inventory")}
              isActive={pathname.startsWith("/inventory")}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/inventory/item-master/create"
                  onMouseEnter={() => onTableNavIntent("/inventory/item-master")}
                  onFocus={() => onTableNavIntent("/inventory/item-master")}
                  onTouchStart={() => onTableNavIntent("/inventory/item-master")}
                  isActive={
                    pathname === "/inventory/item-master/create" ||
                    pathname === "/inventory/item-master" ||
                    pathname.startsWith("/inventory/item-master/")
                  }
                >
                  Item Master
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/inventory/goods-receipt/create"
                  onMouseEnter={() => onTableNavIntent("/inventory/goods-receipt")}
                  onFocus={() => onTableNavIntent("/inventory/goods-receipt")}
                  onTouchStart={() => onTableNavIntent("/inventory/goods-receipt")}
                  isActive={
                    pathname === "/inventory/goods-receipt/create" ||
                    pathname === "/inventory/goods-receipt" ||
                    pathname.startsWith("/inventory/goods-receipt/")
                  }
                >
                  Goods Receipt
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/inventory/goods-issue/create"
                  onMouseEnter={() => onTableNavIntent("/inventory/goods-issue")}
                  onFocus={() => onTableNavIntent("/inventory/goods-issue")}
                  onTouchStart={() => onTableNavIntent("/inventory/goods-issue")}
                  isActive={
                    pathname === "/inventory/goods-issue/create" ||
                    pathname === "/inventory/goods-issue" ||
                    pathname.startsWith("/inventory/goods-issue/")
                  }
                >
                  Goods Issue
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/inventory/transfer-request/create"
                  onMouseEnter={() => onTableNavIntent("/inventory/transfer-request")}
                  onFocus={() => onTableNavIntent("/inventory/transfer-request")}
                  onTouchStart={() => onTableNavIntent("/inventory/transfer-request")}
                  isActive={
                    pathname === "/inventory/transfer-request/create" ||
                    pathname === "/inventory/transfer-request" ||
                    pathname.startsWith("/inventory/transfer-request/")
                  }
                >
                  Inventory Transfer Request
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  to="/inventory/transfer/create"
                  onMouseEnter={() => onTableNavIntent("/inventory/transfer")}
                  onFocus={() => onTableNavIntent("/inventory/transfer")}
                  onTouchStart={() => onTableNavIntent("/inventory/transfer")}
                  isActive={
                    pathname === "/inventory/transfer/create" ||
                    pathname === "/inventory/transfer" ||
                    pathname.startsWith("/inventory/transfer/")
                  }
                >
                  Inventory Transfer
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuCollapsible>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
