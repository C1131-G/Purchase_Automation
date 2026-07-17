import { describe, expect, it } from "vitest";

import {
  createHeaderOnlyDraftStore,
  createLineDraftStore,
  getAutoDocDueDate,
} from "@/store/create/document-draft.factory";

interface TestHeader {
  vendorCode: string;
  docDate: string;
  docDueDate: string;
  comments: string;
}

interface TestLine {
  id: string;
  productCode: string;
  quantity: number;
}

const getDefaultHeader = (): TestHeader => ({
  comments: "",
  docDate: "2026-01-15",
  docDueDate: getAutoDocDueDate("2026-01-15"),
  vendorCode: "",
});

describe("createHeaderOnlyDraftStore", () => {
  it("setHeader patches fields and reset restores defaults", () => {
    const store = createHeaderOnlyDraftStore<TestHeader>({
      getDefaultHeader,
      name: "test-header-draft",
    }).createStore();

    store.getState().setHeader({ vendorCode: "V001", comments: "hello" });
    expect(store.getState().header.vendorCode).toBe("V001");
    expect(store.getState().header.comments).toBe("hello");

    store.getState().reset();
    expect(store.getState().header).toEqual(getDefaultHeader());
  });

  it("auto-fills docDueDate when docDate changes without explicit due date", () => {
    const store = createHeaderOnlyDraftStore<TestHeader>({
      getDefaultHeader,
      name: "test-due-date",
    }).createStore();

    const nextDocDate = "2026-03-01";
    store.getState().setHeader({ docDate: nextDocDate });

    expect(store.getState().header.docDate).toBe(nextDocDate);
    expect(store.getState().header.docDueDate).toBe(getAutoDocDueDate(nextDocDate));
    // offsetMonthPlus2: March 1 + 1 month + 2 days = April 3
    expect(store.getState().header.docDueDate).toBe("2026-04-03");
  });

  it("does not overwrite an explicitly provided docDueDate", () => {
    const store = createHeaderOnlyDraftStore<TestHeader>({
      getDefaultHeader,
      name: "test-explicit-due",
    }).createStore();

    store.getState().setHeader({ docDate: "2026-03-01", docDueDate: "2026-03-10" });
    expect(store.getState().header.docDueDate).toBe("2026-03-10");
  });

  it("creates isolated instances via createStore", () => {
    const api = createHeaderOnlyDraftStore<TestHeader>({
      getDefaultHeader,
      name: "test-isolation",
    });
    const a = api.createStore();
    const b = api.createStore();

    a.getState().setHeader({ vendorCode: "ONLY-A" });
    expect(a.getState().header.vendorCode).toBe("ONLY-A");
    expect(b.getState().header.vendorCode).toBe("");
  });
});

describe("createLineDraftStore", () => {
  it("manages lines and resets header + lines together", () => {
    const store = createLineDraftStore<TestHeader, TestLine>({
      getDefaultHeader,
      name: "test-line-draft",
    }).createStore();

    store.getState().setHeader({ vendorCode: "V9" });
    store.getState().addLine({ id: "1", productCode: "P1", quantity: 2 });
    store.getState().updateLine("1", { quantity: 5 });
    expect(store.getState().lines).toEqual([{ id: "1", productCode: "P1", quantity: 5 }]);

    store.getState().setLines((prev) => [...prev, { id: "2", productCode: "P2", quantity: 1 }]);
    expect(store.getState().lines).toHaveLength(2);

    store.getState().removeLine("1");
    expect(store.getState().lines.map((l) => l.id)).toEqual(["2"]);

    store.getState().reset();
    expect(store.getState().header).toEqual(getDefaultHeader());
    expect(store.getState().lines).toEqual([]);
  });

  it("supports sameAsDocDate due-date strategy", () => {
    const store = createLineDraftStore<TestHeader, TestLine>({
      dueDateStrategy: "sameAsDocDate",
      getDefaultHeader: () => ({
        comments: "",
        docDate: "2026-01-01",
        docDueDate: "2026-01-01",
        vendorCode: "",
      }),
      name: "test-same-due",
    }).createStore();

    store.getState().setHeader({ docDate: "2026-05-20" });
    expect(store.getState().header.docDueDate).toBe("2026-05-20");
  });
});
