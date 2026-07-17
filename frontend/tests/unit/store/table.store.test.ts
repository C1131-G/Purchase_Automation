import { describe, expect, it } from "vitest";

import { createTableStore } from "@/store/table/table.store";

describe("table store multi-id isolation", () => {
  it("keeps filter/pagination/sort/order/visibility independent per tableId", () => {
    const store = createTableStore().createStore();
    const a = "purchase-orders";
    const b = "sales-orders";

    store.getState().setColumnFilters(a, [{ id: "DocNum", value: "100" }]);
    store.getState().setPagination(a, { pageIndex: 2, pageSize: 25, totalRows: 50 });
    store.getState().setSorting(a, [{ id: "DocDate", desc: true }]);
    store.getState().setOrder(a, ["DocNum", "CardName"]);
    store.getState().setVisibility(a, { Comments: false });

    store.getState().setColumnFilters(b, [{ id: "CardCode", value: "C001" }]);
    store.getState().setPagination(b, { pageIndex: 0, pageSize: 10, totalRows: 3 });
    store.getState().setSorting(b, [{ id: "DocTotal", desc: false }]);
    store.getState().setOrder(b, ["CardCode"]);
    store.getState().setVisibility(b, { DocTotal: true });

    const state = store.getState();

    expect(state.filters[a]?.columnFilters).toEqual([{ id: "DocNum", value: "100" }]);
    expect(state.filters[b]?.columnFilters).toEqual([{ id: "CardCode", value: "C001" }]);

    expect(state.pagination[a]).toMatchObject({ pageIndex: 2, pageSize: 25, totalRows: 50 });
    expect(state.pagination[b]).toMatchObject({ pageIndex: 0, pageSize: 10, totalRows: 3 });

    expect(state.sorting[a]).toEqual([{ id: "DocDate", desc: true }]);
    expect(state.sorting[b]).toEqual([{ id: "DocTotal", desc: false }]);

    expect(state.order[a]).toEqual(["DocNum", "CardName"]);
    expect(state.order[b]).toEqual(["CardCode"]);

    expect(state.visibility[a]).toEqual({ Comments: false });
    expect(state.visibility[b]).toEqual({ DocTotal: true });
  });

  it("resetTable clears all slices for one table without affecting another", () => {
    const store = createTableStore().createStore();
    const a = "table-a";
    const b = "table-b";

    store.getState().setColumnFilters(a, [{ id: "x", value: 1 }]);
    store.getState().setPagination(a, { pageIndex: 5, pageSize: 50, totalRows: 100 });
    store.getState().setSorting(a, [{ id: "x", desc: true }]);
    store.getState().setOrder(a, ["a", "b"]);
    store.getState().setVisibility(a, { a: false });

    store.getState().setColumnFilters(b, [{ id: "y", value: 2 }]);
    store.getState().setPagination(b, { pageIndex: 1, pageSize: 20, totalRows: 40 });

    store.getState().resetTable(a, { order: ["default"] });

    const state = store.getState();
    expect(state.filters[a]?.columnFilters).toEqual([]);
    expect(state.filters[a]?.activeFilter).toBeNull();
    expect(state.pagination[a]).toEqual({ pageIndex: 0, pageSize: 10, totalRows: 0 });
    expect(state.sorting[a]).toEqual([]);
    expect(state.visibility[a]).toEqual({});
    expect(state.order[a]).toEqual(["default"]);

    // B untouched
    expect(state.filters[b]?.columnFilters).toEqual([{ id: "y", value: 2 }]);
    expect(state.pagination[b]).toMatchObject({ pageIndex: 1, pageSize: 20 });
  });

  it("builds a fresh instance per createStore call (no cross-test leakage)", () => {
    const first = createTableStore().createStore();
    first.getState().setPagination("t1", { pageIndex: 9, pageSize: 99, totalRows: 1 });

    const second = createTableStore().createStore();
    expect(second.getState().pagination["t1"]).toBeUndefined();
  });
});
