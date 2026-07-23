import { Building2, Download, Menu } from "lucide-react";
import React from "react";

import { SidebarHeader } from "@/components/sidebar";
import { Tooltip } from "@/components/tooltip";
import { IcUnreadBadge } from "@/features/intercompany/components/ic-unread-badge";
import { useAuthStore } from "@/store/auth/auth.store";
import {
  useDeferredPrompt,
  useIsDesktop,
  useIsInstalled,
  usePwaStore,
} from "@/store/pwa/pwa.store";
import { useSetSidebarAction, useSidebarOpen } from "@/store/sidebar/sidebar.store";
import { cn } from "@/shared/utils/cn";

export function ShellLayoutBrandHeader() {
  const user = useAuthStore((state) => state.user);
  const isOpen = useSidebarOpen();
  const setSidebarOpen = useSetSidebarAction();

  const deferredPrompt = useDeferredPrompt();
  const isInstalled = useIsInstalled();
  const isDesktop = useIsDesktop();

  const showInstall = isDesktop && deferredPrompt && !isInstalled;

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        usePwaStore.getState().setIsInstalled(true);
      }
      usePwaStore.getState().setDeferredPrompt(null);
    } catch (err) {
      console.error("Failed to trigger PWA installation prompt:", err);
    }
  };

  return (
    <SidebarHeader
      className={cn(
        "relative border-b border-zinc-50 p-0 pt-[13px] pb-[11px] px-[26px] flex flex-row items-center justify-between",
        !isOpen && "px-2 justify-center",
      )}
    >
      <div className={cn("flex items-center gap-3 min-w-0", !isOpen && "flex-col gap-2")}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSidebarOpen(!isOpen);
          }}
          className="size-9 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer shrink-0 border-none bg-transparent outline-none"
        >
          {isOpen ? <Building2 className="size-5" /> : <Menu className="size-5" />}
        </button>
        {isOpen ? (
          <div className="flex flex-col animate-in fade-in duration-300 min-w-0">
            <span className="text-sm font-black uppercase tracking-tight text-blue-600 leading-tight truncate">
              {user?.companyName ?? "Vendor Portal"}
            </span>
          </div>
        ) : null}
        {!isOpen ? <IcUnreadBadge compact /> : null}
      </div>

      {isOpen ? (
        <div className="flex items-center gap-2 shrink-0">
          <IcUnreadBadge compact />
          {showInstall ? (
            <Tooltip content="Install desktop app" className="w-auto block shrink-0">
              <button
                onClick={handleInstall}
                className="size-8 rounded-lg flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200/60 bg-blue-50/20 shadow-[0_2px_8px_rgba(37,99,235,0.08)] cursor-pointer transition-all duration-200 relative group animate-in fade-in zoom-in duration-300 outline-none shrink-0"
                aria-label="Install App"
              >
                <Download className="size-4 animate-bounce" style={{ animationDuration: "2s" }} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </SidebarHeader>
  );
}
