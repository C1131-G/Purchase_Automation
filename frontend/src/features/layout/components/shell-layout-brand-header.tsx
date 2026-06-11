import { Building2, Menu } from "lucide-react";

import { SidebarHeader } from "@/components/sidebar";
import { useAuthStore } from "@/store/auth/auth.store";
import { useSetSidebarAction, useSidebarOpen } from "@/store/sidebar/sidebar.store";

export function ShellLayoutBrandHeader() {
  const user = useAuthStore((state) => state.user);
  const isOpen = useSidebarOpen();
  const setSidebarOpen = useSetSidebarAction();

  return (
    <SidebarHeader className="border-b border-zinc-50 p-0 pt-[13px] pb-[11px] px-[26px] flex flex-row items-center justify-start">
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSidebarOpen(!isOpen);
          }}
          className="size-9 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer shrink-0 border-none bg-transparent outline-none"
        >
          {isOpen ? <Building2 className="size-5" /> : <Menu className="size-5" />}
        </button>
        <div className="flex flex-col group-data-[collapsible=icon]:hidden animate-in fade-in duration-300">
          <span className="text-sm font-black uppercase tracking-tight text-blue-600 leading-tight">
            {user?.companyName ?? "Vendor Portal"}
          </span>
        </div>
      </div>
    </SidebarHeader>
  );
}
