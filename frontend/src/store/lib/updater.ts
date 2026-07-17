/** Updater: direct value or functional update from previous state. */
export type Updater<T> = T | ((prev: T) => T);

/** Resolve an Updater against the current value. */
export function applyUpdater<T>(current: T, next: Updater<T>): T {
  return typeof next === "function" ? (next as (prev: T) => T)(current) : next;
}
