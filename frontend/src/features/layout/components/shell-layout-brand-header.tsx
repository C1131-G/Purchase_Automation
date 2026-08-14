import { Building2, Download } from "lucide-react";
import React from "react";

import { SidebarHeader } from "@/components/sidebar";
import { Tooltip } from "@/components/tooltip";
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

  const companyLabel = user?.companyName ?? "Purchase Automation";
  const databaseName = user?.dbName?.trim() ?? "";
  const companyInitial = companyLabel.trim().charAt(0).toUpperCase() || "P";
  const brandTooltip = databaseName ? `${companyLabel} · ${databaseName}` : companyLabel;

  const toggleButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSidebarOpen(!isOpen);
      }}
      className="size-9 flex items-center justify-center rounded-lg bg-ink-900 text-surface shadow-sm ring-1 ring-ink-900/10 transition-colors hover:bg-ink-800 cursor-pointer shrink-0 border-none outline-none"
      aria-label={brandTooltip}
      title={brandTooltip}
    >
      {isOpen ? (
        <Building2 className="size-5 shrink-0" />
      ) : companyInitial ? (
        <span className="text-xs font-bold tracking-wide leading-none">{companyInitial}</span>
      ) : (
        <Building2 className="size-4 shrink-0" />
      )}
    </button>
  );

  return (
    <SidebarHeader
      className={cn(
        "relative border-b border-linen-100 p-0 pt-[13px] pb-[11px] px-[26px] flex flex-row items-start justify-between",
        !isOpen && "px-2 justify-center",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 min-w-0 flex-1",
          !isOpen && "flex-col items-center gap-2",
        )}
      >
        {isOpen ? (
          toggleButton
        ) : (
          <Tooltip content={brandTooltip} className="w-auto max-w-xs">
            {toggleButton}
          </Tooltip>
        )}
        {isOpen ? (
          <div className="flex min-w-0 flex-1 flex-col animate-in fade-in duration-300">
            <span
              className="text-sm font-bold leading-tight tracking-tight text-ink-900 text-pretty break-words"
              title={companyLabel}
            >
              {companyLabel}
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-widest text-neutral-400 truncate"
              title={databaseName || "Purchase Automation"}
            >
              {databaseName || "Purchase Automation"}
            </span>
          </div>
        ) : null}
      </div>

      {isOpen && showInstall ? (
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip content="Install desktop app" className="w-auto block shrink-0">
            <button
              onClick={handleInstall}
              className="size-8 rounded-lg flex items-center justify-center text-teal-700 hover:text-teal-800 hover:bg-teal-50 border border-teal-200/60 bg-teal-50/20 shadow-[0_2px_8px_rgba(15,118,110,0.08)] cursor-pointer transition-all duration-200 relative group animate-in fade-in zoom-in duration-300 outline-none shrink-0"
              aria-label="Install App"
            >
              <Download className="size-4 animate-bounce" style={{ animationDuration: "2s" }} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
            </button>
          </Tooltip>
        </div>
      ) : null}
    </SidebarHeader>
  );
}
