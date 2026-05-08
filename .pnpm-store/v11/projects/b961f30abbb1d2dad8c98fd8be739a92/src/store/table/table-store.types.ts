/** Updater: Utility type for functional state updates. */
export type Updater<T> = T | ((prev: T) => T);
