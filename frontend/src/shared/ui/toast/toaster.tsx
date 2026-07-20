import { Toaster } from "sonner";

import "@/shared/ui/toast/toast.css";

/**
 * Single app-wide toast host. Mount once in the root route.
 * Visuals + Motion live in `toast-item` via `toast.custom` — host is a transparent stack.
 */
export function AppToaster() {
  return (
    <Toaster
      theme="light"
      position="top-right"
      expand
      gap={10}
      visibleToasts={4}
      offset={{ top: 16, right: 16 }}
      mobileOffset={{ top: 12, right: 12, left: 12 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          // Transparent shell — AppToastItem owns surface, chrome, and motion.
          toast: "bg-transparent! border-0! shadow-none! p-0! w-auto! outline-none!",
        },
      }}
      className="font-outfit"
    />
  );
}
