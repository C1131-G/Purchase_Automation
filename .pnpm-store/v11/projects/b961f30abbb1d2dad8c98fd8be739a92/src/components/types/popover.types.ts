import React from "react";

export interface PopoverRootProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export type PopoverTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  unstyled?: boolean;
  id?: string;
}
