/**
 * Route-level hierarchy used to determine navigation transition direction.
 *
 *  -1  →  /login
 *   0  →  /  |  /dashboard/*
 *   1  →  /purchase/* | /sales/* | /inventory/*  (table pages)
 *   2  →  any path containing /create | /edit | /create-*  (create/edit pages)
 */
export type TransitionDir = "slide-left" | "slide-right" | "slide-up" | "slide-down";

export function getRouteLevel(pathname: string): number {
  if (pathname === "/login" || pathname.startsWith("/login")) return -1;
  if (pathname === "/" || pathname.startsWith("/dashboard")) return 0;

  // Create / Edit pages are the deepest level (level 2)
  if (
    pathname.includes("/create") ||
    pathname.includes("/edit") ||
    /\/create-[a-z]/.test(pathname)
  ) {
    return 2;
  }

  // Everything else under /purchase, /sales, /inventory is a table (level 1)
  return 1;
}

/**
 * Returns the correct slide direction for a navigation from `fromPathname` to `toPathname`.
 *
 * Rules (mobile-native feel):
 *  - Login → App         : slide-up   (phone unlock)
 *  - App   → Login       : slide-down (app closing)
 *  - Dashboard switching : slide-up   (tab-switch feel)
 *  - Going deeper        : slide-left (forward)
 *  - Going up / back     : slide-right (backward)
 *  - Same level, cross   : slide-left  (lateral move)
 */
let isSidebarNavigated = false;

export function markSidebarNavigation(): void {
  isSidebarNavigated = true;
}

export function getTransitionDirection(fromPathname: string, toPathname: string): TransitionDir {
  if (isSidebarNavigated) {
    isSidebarNavigated = false;
    return "slide-up";
  }

  const fromLevel = getRouteLevel(fromPathname);
  const toLevel = getRouteLevel(toPathname);

  // Login → App: slide-up (phone unlock feel)
  if (fromLevel === -1 && toLevel >= 0) return "slide-up";

  // App → Login (logout / session expired): slide-down
  if (toLevel === -1) return "slide-down";

  // Dashboard switching (both level 0, different paths): slide-up
  if (fromLevel === 0 && toLevel === 0 && fromPathname !== toPathname) return "slide-up";

  // Going deeper in the hierarchy → slide-left (forward)
  if (toLevel > fromLevel) return "slide-left";

  // Going up / backward → slide-right
  if (toLevel < fromLevel) return "slide-right";

  // Same level, different paths (e.g. Purchase table → Sales table) → slide-left
  return "slide-left";
}
