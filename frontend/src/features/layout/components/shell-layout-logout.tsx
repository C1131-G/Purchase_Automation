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
        "border-t border-linen-100 bg-gradient-to-b from-surface to-linen-50/50 transition-all duration-300",
        isOpen ? "p-4" : "p-2.5 flex items-center justify-center",
      )}
    >
      <SidebarMenu className="gap-3">
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
                "h-11 w-full rounded-xl border border-linen-200 bg-surface text-neutral-600 normal-case tracking-normal hover:bg-linen-50 focus:ring-linen-200",
                isFullscreen &&
                  "border-teal-200 bg-teal-50/50 text-teal-700 hover:bg-teal-50 hover:border-teal-300",
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
                "size-9 rounded-xl bg-linen-100 text-neutral-600 hover:bg-linen-200 flex items-center justify-center border border-linen-200/50 cursor-pointer mx-auto transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-linen-200/50",
                isFullscreen &&
                  "bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200/50 focus:ring-teal-300/40",
              )}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          )}
        </SidebarMenuItem>

        <SidebarMenuItem className={cn(!isOpen && "flex justify-center w-full")}>
          {isOpen ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              disabled={logoutBusy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-ink-900/10 bg-ink-900 px-4 text-[13px] font-semibold tracking-wide text-surface shadow-sm transition-colors hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:opacity-60"
            >
              {logoutBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              {logoutBusy ? "Logging out…" : "Log out"}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              disabled={logoutBusy}
              className="flex size-9 items-center justify-center rounded-xl border border-ink-900/10 bg-ink-900 text-surface shadow-sm transition-colors hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 disabled:opacity-60 mx-auto"
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
