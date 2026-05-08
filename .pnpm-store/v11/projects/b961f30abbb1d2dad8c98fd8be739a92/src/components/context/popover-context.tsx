import React, { createContext, useContext } from "react";

interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  contentId: string;
}

/**
 * PopoverContext: State coordination for floating industrial utility containers.
 * REFS: Tracks trigger and content nodes for outside-click and escape-key handling.
 */
export const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error("usePopover must be used within a PopoverRoot");
  }
  return context;
}
