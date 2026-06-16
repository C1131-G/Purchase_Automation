import { Link } from "@tanstack/react-router";
import { ChevronRight, PanelLeftIcon } from "lucide-react";
import React from "react";

import type {
  SidebarContentProps,
  SidebarFooterProps,
  SidebarGroupContentProps,
  SidebarGroupProps,
  SidebarHeaderProps,
  SidebarInsetProps,
  SidebarMenuButtonProps,
  SidebarMenuCollapsibleProps,
  SidebarMenuItemProps,
  SidebarMenuProps,
  SidebarMenuSubButtonProps,
  SidebarMenuSubItemProps,
  SidebarMenuSubProps,
  SidebarProps,
  SidebarProviderProps,
  SidebarTriggerProps,
} from "@/components/types/sidebar.types";
import { cn } from "@/shared/utils/cn";
import { MOTION_EASING, MOTION_MS } from "@/shared/utils/motion";
import {
  useSetSidebarAction,
  useSidebarOpen,
  useToggleSidebarAction,
} from "@/store/sidebar/sidebar.store";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "5.5rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/**
 * Sidebar: Persistent application navigation architecture.
 *
 * DESIGN: Multi-state (expanded/collapsed/offcanvas) with industrial fluid transitions.
 * UX: Modern "Control+B" keyboard shortcut and interactive hover highlights.
 * ARCHITECTURE: Composite structure (Header, Content, Menu, Footer) for scalable ERP navigation.
 */
export function SidebarProvider({ className, style, children, ...props }: SidebarProviderProps) {
  const toggleSidebar = useToggleSidebarAction();
  const open = useSidebarOpen();
  const setOpen = useSetSidebarAction();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen, toggleSidebar]);

  return (
    <div
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          transitionDuration: `${MOTION_MS.sidebarOpenClose}ms`,
          transitionTimingFunction: MOTION_EASING.smoothOut,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "group/sidebar-wrapper flex min-h-screen w-full transition-[padding]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  style,
  ...props
}: SidebarProps) {
  const open = useSidebarOpen();
  const setOpen = useSetSidebarAction();
  const state = open ? "expanded" : "collapsed";
  const resolvedWidth =
    state === "collapsed"
      ? collapsible === "offcanvas"
        ? "0"
        : collapsible === "icon"
          ? "var(--sidebar-width-icon)"
          : "var(--sidebar-width)"
      : "var(--sidebar-width)";

  const sidebarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return;
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  if (collapsible === "none") {
    return (
      <div
        className={cn(
          "bg-white border-r border-zinc-100 flex h-full w-(--sidebar-width) flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          style={{
            transitionDuration: `${MOTION_MS.sidebarBackdrop}ms`,
            transitionTimingFunction: MOTION_EASING.smoothOut,
          }}
          className="fixed inset-0 z-[110] bg-zinc-950/8 backdrop-blur-sm transition-opacity block border-none outline-none cursor-pointer"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        ref={sidebarRef}
        style={
          {
            transitionDuration: `${MOTION_MS.sidebarOpenClose}ms`,
            transitionTimingFunction: MOTION_EASING.smoothOut,
            width: resolvedWidth,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group fixed left-0 top-0 h-screen z-[120] overflow-hidden border-r border-zinc-100 bg-white transition-[width,border-color,box-shadow] will-change-[width]",
          open ? "block" : "hidden md:block",
          state === "collapsed" && collapsible === "offcanvas" && "border-r-0!",
          className,
        )}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        onClick={() => {
          if (!open) {
            setOpen(true);
          }
        }}
        {...props}
      >
        <div
          style={
            {
              transitionDuration: `${MOTION_MS.sidebarContentFade}ms`,
              transitionTimingFunction: MOTION_EASING.smoothOut,
              width:
                state === "collapsed" && collapsible === "icon"
                  ? "var(--sidebar-width-icon)"
                  : "var(--sidebar-width)",
            } as React.CSSProperties
          }
          className={cn(
            "flex h-full flex-col transition-opacity",
            state === "collapsed" && collapsible === "offcanvas"
              ? "pointer-events-none opacity-0"
              : "opacity-100",
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}

export function SidebarTrigger({ className, onClick, children, ...props }: SidebarTriggerProps) {
  const toggleSidebar = useToggleSidebarAction();

  return (
    <button
      className={cn(
        "group inline-flex items-center justify-center rounded-xl p-2.5 text-zinc-400 hover:text-blue-600 focus-visible:outline-none focus:ring-0 transition-colors duration-150 cursor-pointer border-none bg-transparent",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {children || <PanelLeftIcon className="size-5" />}
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

export function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return (
    <main
      className={cn(
        "relative z-0 flex min-w-0 flex-1 flex-col bg-zinc-50 transition-[filter,opacity] duration-200",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <div className={cn("gap-2 p-4 flex flex-col border-b border-zinc-50", className)} {...props} />
  );
}

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <div
      className={cn("gap-2 p-4 flex flex-col border-t border-zinc-50 mt-auto w-full", className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: SidebarContentProps) {
  return (
    <div
      className={cn("flex-1 flex flex-col overflow-y-auto no-scrollbar", className)}
      {...props}
    />
  );
}

export function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return (
    <div
      className={cn(
        "p-2 relative flex w-full min-w-0 flex-col group-data-[collapsible=icon]:px-0",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ...props }: SidebarGroupContentProps) {
  return <div className={cn("text-sm w-full space-y-1", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: SidebarMenuProps) {
  return <ul className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: SidebarMenuItemProps) {
  return (
    <li
      className={cn("relative px-2 group-data-[collapsible=icon]:px-0.5", className)}
      {...props}
    />
  );
}

export function SidebarMenuButton({
  isActive = false,
  className,
  children,
  ...props
}: SidebarMenuButtonProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl p-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 cursor-pointer",
        "hover:bg-blue-50 hover:text-blue-600 text-zinc-500",
        isActive && "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]",
        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarMenuCollapsible({
  children,
  title,
  icon: Icon,
  isActive = false,
  isOpen = false,
  onToggle,
}: SidebarMenuCollapsibleProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onToggle}
        isActive={isActive}
        className="justify-between group/trigger"
      >
        <div className="flex items-center gap-3">
          <Icon className="size-5" />
          <span className="group-data-[collapsible=icon]:hidden">{title}</span>
        </div>
        <ChevronRight
          className={cn(
            "size-3.5 transition-transform duration-300 text-zinc-300 group-hover/trigger:text-blue-600 group-data-[collapsible=icon]:hidden",
            isOpen && "rotate-90",
            isActive && "text-white group-hover/trigger:text-white",
          )}
        />
      </SidebarMenuButton>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 overflow-hidden",
        )}
      >
        <div className="min-h-0">
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </div>
      </div>
    </SidebarMenuItem>
  );
}

export function SidebarMenuSub({ className, ...props }: SidebarMenuSubProps) {
  return (
    <ul
      className={cn(
        "ml-8 space-y-1 border-l border-zinc-200 pl-4 group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenuSubItem({ ...props }: SidebarMenuSubItemProps) {
  return <li {...props} />;
}

export function SidebarMenuSubButton({
  isActive = false,
  className,
  children,
  ...props
}: SidebarMenuSubButtonProps) {
  const setOpen = useSetSidebarAction();
  const handleSubMenuClick = () => {
    setOpen(false);
  };

  return (
    <Link
      preload="intent"
      viewTransition
      className={cn(
        "relative flex w-full items-center text-[13px] py-1.5 text-zinc-400 hover:text-blue-600 transition-colors duration-150 text-left cursor-pointer bg-transparent",
        isActive && "text-blue-600 font-bold",
        className,
      )}
      onClick={handleSubMenuClick}
      {...props}
    >
      {isActive && (
        <div className="absolute -left-4.25 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-600 rounded-full" />
      )}
      {children}
    </Link>
  );
}
