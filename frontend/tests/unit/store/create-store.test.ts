import { describe, expect, it } from "vitest";

import { createAppStore, isStoreDevtoolsEnabled } from "@/store/lib/create-store";

describe("createAppStore / isStoreDevtoolsEnabled", () => {
  it("exports a boolean gate for DEV-only devtools", () => {
    // In Vitest/Node import.meta.env.DEV is typically true; the important contract
    // is that production builds pass enabled: false into zustand middleware.
    expect(typeof isStoreDevtoolsEnabled()).toBe("boolean");
  });

  it("wires named actions and returns isolated createStore instances", () => {
    const api = createAppStore<{ count: number; inc: () => void }>(
      { name: "counter-test-store" },
      (set) => ({
        count: 0,
        inc: () => set((s) => ({ count: s.count + 1 }), false, "counter/inc"),
      }),
    );

    const a = api.createStore();
    const b = api.createStore();
    a.getState().inc();
    expect(a.getState().count).toBe(1);
    expect(b.getState().count).toBe(0);
  });

  it("supports immer mode for nested updates", () => {
    const api = createAppStore<{ nest: { value: number }; bump: () => void }>(
      { immer: true, name: "immer-test-store" },
      (set) => ({
        nest: { value: 0 },
        bump: () =>
          set(
            (state) => {
              state.nest.value += 1;
            },
            false,
            "immer/bump",
          ),
      }),
    );

    const store = api.createStore();
    store.getState().bump();
    expect(store.getState().nest.value).toBe(1);
  });
});
