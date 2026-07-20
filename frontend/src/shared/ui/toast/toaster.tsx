import { Toaster } from "sonner";

/**
 * Single app-wide toast host. Mount once in the root route.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      richColors
      visibleToasts={3}
      toastOptions={{
        className: "font-outfit",
      }}
    />
  );
}
