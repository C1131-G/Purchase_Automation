import { describe, expect, it } from "vitest";

import {
  clampArDraftPageParams,
  isPendingOwddStatus,
  mapArApprovalRow,
  mapArInvoiceDraftRow,
  mapArOpenInvoiceRow,
  mapOwddStatusLabel,
  pickRowField,
  AR_DRAFT_PAGE_DEFAULT,
  AR_DRAFT_PAGE_MAX,
} from "@/modules/dashboard/dashboard.ar-approval.queries";

describe("overview AR invoice draft mapping", () => {
  it("maps ODRF AR invoice draft row", () => {
    const item = mapArInvoiceDraftRow({
      DocEntry: 9001,
      DocNum: 12045,
      CardCode: "C1000",
      CardName: "Ajax Trading",
      DocTotal: 1500.5,
      DocDate: "2026-07-01",
      CreateDate: "2026-07-01",
      UserSign: 3,
      AgeDays: 3,
    });

    expect(item).toMatchObject({
      docEntry: 9001,
      docNum: 12045,
      isDraft: true,
      status: "Draft",
      wddCode: 9001,
      cardCode: "C1000",
      cardName: "Ajax Trading",
      docTotal: 1500.5,
      docDate: "2026-07-01",
      ageDays: 3,
    });
  });

  it("maps open OINV row (legacy mapper retained)", () => {
    const item = mapArOpenInvoiceRow({
      DocEntry: 501,
      DocNum: 12045,
      CardCode: "C1000",
      CardName: "Ajax Trading",
      DocTotal: 1500.5,
      DocDate: "2026-07-01",
      AgeDays: 3,
    });

    expect(item).toMatchObject({
      docEntry: 501,
      docNum: 12045,
      isDraft: false,
      cardCode: "C1000",
      cardName: "Ajax Trading",
      docTotal: 1500.5,
      docDate: "2026-07-01",
      status: "Open",
      ageDays: 3,
      wddCode: 501,
    });
  });

  it("clamps AR draft page params (no hard total cap; max page size)", () => {
    expect(clampArDraftPageParams({})).toEqual({
      offset: 0,
      limit: AR_DRAFT_PAGE_DEFAULT,
    });
    expect(clampArDraftPageParams({ offset: -5, limit: 0 })).toEqual({
      offset: 0,
      limit: 1,
    });
    expect(clampArDraftPageParams({ offset: 80, limit: 500 })).toEqual({
      offset: 80,
      limit: AR_DRAFT_PAGE_MAX,
    });
  });
});

describe("overview AR approval OWDD mapping (P3)", () => {
  it("maps pending draft row with mixed-case columns", () => {
    const item = mapArApprovalRow({
      wddCode: 42,
      status: "w",
      isDraft: "Y",
      draftEntry: 9001,
      docEntry: 9001,
      joinedDocEntry: 9001,
      docNum: 0,
      cardCode: "C1000",
      cardName: "Ajax Trading",
      docTotal: "1500.5",
      docDate: "2026-07-01",
      createDate: "2026-07-01",
      ownerId: "manager",
      ageDays: 3,
    });

    expect(item).not.toBeNull();
    expect(item).toMatchObject({
      wddCode: 42,
      docEntry: 9001,
      docNum: null,
      isDraft: true,
      cardCode: "C1000",
      cardName: "Ajax Trading",
      docTotal: 1500.5,
      docDate: "2026-07-01",
      status: "Pending",
      ageDays: 3,
      requester: "manager",
    });
  });

  it("maps posted invoice row and prefers DocNum", () => {
    const item = mapArApprovalRow({
      WddCode: 7,
      Status: "W",
      IsDraft: "N",
      DraftEntry: 0,
      DocEntry: 501,
      JoinedDocEntry: 501,
      DocNum: 12045,
      CardCode: "C2000",
      CardName: "RCM Supplies",
      DocTotal: 99,
      DocDate: "2026-06-20T00:00:00.000Z",
      OwnerID: "sales1",
      AgeDays: 10,
    });

    expect(item).toMatchObject({
      wddCode: 7,
      docEntry: 501,
      docNum: 12045,
      isDraft: false,
      status: "Pending",
      ageDays: 10,
      requester: "sales1",
    });
  });

  it("returns null without WddCode", () => {
    expect(mapArApprovalRow({ Status: "W", DocEntry: 1 })).toBeNull();
  });

  it("treats only W as pending status", () => {
    expect(isPendingOwddStatus("W")).toBe(true);
    expect(isPendingOwddStatus("w")).toBe(true);
    expect(isPendingOwddStatus("Y")).toBe(false);
    expect(isPendingOwddStatus("N")).toBe(false);
    expect(isPendingOwddStatus("")).toBe(false);
  });

  it("labels known OWDD status codes", () => {
    expect(mapOwddStatusLabel("W")).toBe("Pending");
    expect(mapOwddStatusLabel("Y")).toBe("Approved");
    expect(mapOwddStatusLabel("N")).toBe("Rejected");
    expect(mapOwddStatusLabel("P")).toBe("Generated");
    expect(mapOwddStatusLabel("Z")).toBe("Z");
  });

  it("pickRowField is case-insensitive", () => {
    const row = { CardCode: "X1", DocTotal: 12 };
    expect(pickRowField(row, "cardCode")).toBe("X1");
    expect(pickRowField(row, "DOCTOTAL")).toBe(12);
    expect(pickRowField(row, "missing")).toBeUndefined();
  });
});
