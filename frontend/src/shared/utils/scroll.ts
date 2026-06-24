/**
 * Scrolls the window and all scrollable containers (elements with `overflow-y-auto`) to the top.
 * Since the layout structure wraps pages in containers with `overflow-y-auto` (like CreatePageWrapper),
 * standard `window.scrollTo` calls may not scroll the visible page viewport.
 */
export function scrollToTop(behavior: ScrollBehavior = "smooth") {
  window.scrollTo({ behavior, top: 0 });
  if (typeof document !== "undefined") {
    document.querySelectorAll(".overflow-y-auto").forEach((el) => {
      el.scrollTo({ behavior, top: 0 });
    });
  }
}
