import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand";
import { devtools, type DevtoolsOptions } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/** True only in Vite DEV builds — never enable Redux DevTools in production. */
export const isStoreDevtoolsEnabled = (): boolean =>
  typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

export interface CreateAppStoreOptions {
  /** Name shown in Redux DevTools when multiple stores are open. */
  name: string;
  /** Use immer middleware for nested mutable-style updates. Default false. */
  immer?: boolean;
}

type DevtoolsMiddleware = ["zustand/devtools", never];
type ImmerMiddleware = ["zustand/immer", never];

export type AppStoreCreator<T> = StateCreator<T, [DevtoolsMiddleware], [], T>;
export type AppImmerStoreCreator<T> = StateCreator<T, [ImmerMiddleware, DevtoolsMiddleware], [], T>;

/**
 * Build a typed Zustand store with curried create, DEV-only devtools, and optional immer.
 * Returns both the React hook (singleton) and a pure creator for isolated unit tests.
 */
export function createAppStore<T extends object>(
  options: CreateAppStoreOptions & { immer?: false },
  stateCreator: AppStoreCreator<T>,
): {
  useStore: UseBoundStore<StoreApi<T>>;
  createStore: () => UseBoundStore<StoreApi<T>>;
};
export function createAppStore<T extends object>(
  options: CreateAppStoreOptions & { immer: true },
  stateCreator: AppImmerStoreCreator<T>,
): {
  useStore: UseBoundStore<StoreApi<T>>;
  createStore: () => UseBoundStore<StoreApi<T>>;
};
export function createAppStore<T extends object>(
  options: CreateAppStoreOptions,
  stateCreator: AppStoreCreator<T> | AppImmerStoreCreator<T>,
): {
  useStore: UseBoundStore<StoreApi<T>>;
  createStore: () => UseBoundStore<StoreApi<T>>;
} {
  const devtoolsOptions: DevtoolsOptions = {
    enabled: isStoreDevtoolsEnabled(),
    name: options.name,
  };

  const createStore = (): UseBoundStore<StoreApi<T>> => {
    if (options.immer) {
      return create<T>()(
        devtools(immer(stateCreator as AppImmerStoreCreator<T>), devtoolsOptions),
      ) as UseBoundStore<StoreApi<T>>;
    }
    return create<T>()(devtools(stateCreator as AppStoreCreator<T>, devtoolsOptions));
  };

  return {
    createStore,
    useStore: createStore(),
  };
}
