import { Building2, Menu } from "lucide-react";

import { SidebarHeader } from "@/components/sidebar";
import { cn } from "@/shared/utils/cn";
import { useAuthStore } from "@/store/auth/auth.store";
import { useSetSidebarAction, useSidebarOpen } from "@/store/sidebar/sidebar.store";

export function ShellLayoutBrandHeader() {
  const user = useAuthStore((state) => state.user);
  const isOpen = useSidebarOpen();
  const setSidebarOpen = useSetSidebarAction();

  return (
    <SidebarHeader
      className={cn(
        "border-zinc-50 transition-all duration-300",
        isOpen ? "pt-[28px] pb-5 px-5" : "pt-[18px] pb-2.5 px-2.5 flex items-center justify-center",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(!isOpen);
            }}
            className="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-[0_4px_10px_rgba(37,99,235,0.2)] hover:bg-blue-700 transition-colors cursor-pointer shrink-0 border-none outline-none"
          >
            {isOpen ? <Building2 className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden animate-in fade-in duration-1000">
            <span className="text-sm font-black uppercase tracking-tight text-blue-600 leading-tight">
              {user?.companyName ?? "Vendor Portal"}
            </span>
          </div>
        </div>
      </div>
    </SidebarHeader>
  );
}
