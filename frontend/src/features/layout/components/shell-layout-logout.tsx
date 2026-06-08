import { LogOut } from "lucide-react";

import { Button } from "@/components/button";
import { SidebarFooter, SidebarMenu, SidebarMenuItem } from "@/components/sidebar";
import { cn } from "@/shared/utils/cn";
import { useSidebarOpen } from "@/store/sidebar/sidebar.store";

interface ShellLayoutLogoutProps {
  logoutBusy: boolean;
  onLogout: () => void;
}

export function ShellLayoutLogout({ logoutBusy, onLogout }: ShellLayoutLogoutProps) {
  const isOpen = useSidebarOpen();

  return (
    <SidebarFooter
      className={cn(
        "border-t border-zinc-50 transition-all duration-300",
        isOpen ? "p-4" : "p-2.5 flex items-center justify-center",
      )}
    >
      <SidebarMenu>
        <SidebarMenuItem className={cn(!isOpen && "flex justify-center w-full")}>
          {isOpen ? (
            <Button
              type="button"
              onClick={onLogout}
              isLoading={logoutBusy}
              loadingText="Logging out..."
              variant="danger"
              className="h-11 w-full rounded-xl border border-red-200 bg-red-50 text-red-700 normal-case tracking-normal shadow-[0_4px_10px_rgba(248,113,113,0.18)] hover:bg-red-100 focus:ring-red-300/40"
            >
              Log out
            </Button>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              disabled={logoutBusy}
              className="size-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center border border-red-200/50 cursor-pointer mx-auto transition-all shadow-[0_2px_6px_rgba(248,113,113,0.1)] focus:outline-none focus:ring-2 focus:ring-red-300/40"
              title="Log out"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
