import { Loader2, LogOut, Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/button";
import { SidebarFooter, SidebarMenu, SidebarMenuItem } from "@/components/sidebar";
import { cn } from "@/shared/utils/cn";
import { useSidebarOpen } from "@/store/sidebar/sidebar.store";

interface ShellLayoutLogoutProps {
  logoutBusy: boolean;
  onLogout: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ShellLayoutLogout({
  logoutBusy,
  onLogout,
  isFullscreen,
  onToggleFullscreen,
}: ShellLayoutLogoutProps) {
  const isOpen = useSidebarOpen();

  return (
    <SidebarFooter
      className={cn(
        "border-t border-zinc-50 transition-all duration-300",
        isOpen ? "p-4" : "p-2.5 flex items-center justify-center",
      )}
    >
      <SidebarMenu className="gap-2">
        <SidebarMenuItem className={cn(!isOpen && "flex justify-center w-full")}>
          {isOpen ? (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              variant="outline"
              className={cn(
                "h-11 w-full rounded-xl border border-zinc-200 bg-white text-zinc-700 normal-case tracking-normal hover:bg-zinc-50 focus:ring-zinc-100",
                isFullscreen &&
                  "border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-50 hover:border-blue-300",
              )}
            >
              <span className="flex items-center gap-3 w-full justify-start font-semibold">
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                {isFullscreen ? "Exit Full" : "Fullscreen"}
              </span>
            </Button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              className={cn(
                "size-9 rounded-xl bg-zinc-50 text-zinc-600 hover:bg-zinc-100 flex items-center justify-center border border-zinc-200/50 cursor-pointer mx-auto transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-200/50",
                isFullscreen &&
                  "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200/50 focus:ring-blue-300/40",
              )}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          )}
        </SidebarMenuItem>

        <SidebarMenuItem className={cn(!isOpen && "flex justify-center w-full")}>
          {isOpen ? (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              disabled={logoutBusy}
              className="size-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center border border-red-200/50 cursor-pointer mx-auto transition-colors duration-150 shadow-[0_2px_6px_rgba(248,113,113,0.1)] focus:outline-none focus:ring-2 focus:ring-red-300/40"
              title="Log out"
            >
              {logoutBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
            </button>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
