import type { Link } from "@tanstack/react-router";
import React from "react";

export type SidebarProviderProps = React.ComponentProps<"div">;

/**
 * SidebarProps: Master configuration for application navigation.
 * COLLAPSIBLE: Controls offcanvas (mobile), icon (compact), or none (fixed) states.
 */
export type SidebarProps = React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
};

export type SidebarTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export type SidebarInsetProps = React.ComponentProps<"main">;

export type SidebarHeaderProps = React.ComponentProps<"div">;

export type SidebarFooterProps = React.ComponentProps<"div">;

export type SidebarContentProps = React.ComponentProps<"div">;

export type SidebarGroupProps = React.ComponentProps<"div">;

export type SidebarGroupContentProps = React.ComponentProps<"div">;

export type SidebarMenuProps = React.ComponentProps<"ul">;

export type SidebarMenuItemProps = React.ComponentProps<"li">;

export type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean;
};

export interface SidebarMenuCollapsibleProps {
  children: React.ReactNode;
  title: string;
  icon: React.ElementType;
  isActive?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  /**
   * Optional trailing chrome on the section header (e.g. unread badge).
   * Hidden in icon-collapsed mode; use `iconBadge` for that state.
   */
  trailing?: React.ReactNode;
  /** Small badge over the section icon (visible in icon-collapsed sidebar). */
  iconBadge?: React.ReactNode;
}

export type SidebarMenuSubProps = React.ComponentProps<"ul">;

export type SidebarMenuSubItemProps = React.ComponentProps<"li">;

export type SidebarMenuSubButtonProps = React.ComponentProps<typeof Link> & {
  isActive?: boolean;
  children: React.ReactNode;
};
