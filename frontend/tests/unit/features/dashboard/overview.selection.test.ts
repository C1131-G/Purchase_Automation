import { describe, expect, it } from "vitest";

import type {
  OverviewConnectedPartner,
  OverviewStatement,
} from "@/features/dashboard/utils/overview.types";
import {
  emptyOverviewAging,
  findStatementPartner,
  partnerSelectionKey,
  resolveStatementView,
  roleToCardType,
} from "@/features/dashboard/utils/overview.types";

const samplePartner = {
  mappingId: 1,
  buyerCompanyId: 10,
  buyerCompanyName: "Buyer Co",
  vendorCompanyId: 20,
  vendorCompanyName: "Vendor Co",
  vendorCode: "V100",
  vendorName: "Vendor Name",
  buyerCustomerCode: "C200",
  customerName: "Customer Name",
  role: "vendor" as const,
  cardCode: "V100",
  cardName: "Vendor Name",
  partnerCompanyId: 20,
  partnerCompanyName: "Vendor Co",
} satisfies OverviewConnectedPartner;

const statement: OverviewStatement = {
  partners: [
    {
      cardCode: "V100",
      cardName: "Vendor Name",
      cardType: "S",
      balance: 1200,
      aging: { d0_30: 100, d31_60: 50, d61_90: 0, d90_plus: 25 },
    },
    {
      cardCode: "C200",
      cardName: "Customer Name",
      cardType: "C",
      balance: 800,
      aging: { d0_30: 200, d31_60: 0, d61_90: 10, d90_plus: 0 },
    },
  ],
  totals: {
    balance: 2000,
    aging: { d0_30: 300, d31_60: 50, d61_90: 10, d90_plus: 25 },
  },
};

describe("overview selection helpers (P5)", () => {
  it("builds a stable partner selection key", () => {
    expect(partnerSelectionKey(samplePartner)).toBe("1:vendor");
    expect(
      partnerSelectionKey({
        ...samplePartner,
        role: "customer",
        cardCode: "C200",
      }),
    ).toBe("1:customer");
  });

  it("maps role to SAP card type", () => {
    expect(roleToCardType("vendor")).toBe("S");
    expect(roleToCardType("customer")).toBe("C");
  });

  it("finds statement row by cardCode + cardType", () => {
    const row = findStatementPartner(statement.partners, {
      kind: "partner",
      mappingId: 1,
      role: "vendor",
      cardCode: "V100",
      cardName: "Vendor Name",
      partnerCompanyName: "Vendor Co",
    });
    expect(row?.balance).toBe(1200);
    expect(row?.cardType).toBe("S");
  });

  it("resolves all-connected totals by default", () => {
    const view = resolveStatementView({ kind: "all" }, statement, 2);
    expect(view.balance).toBe(2000);
    expect(view.aging.d0_30).toBe(300);
    expect(view.showEmptyPartner).toBe(false);
    expect(view.selectedPartner).toBeNull();
  });

  it("resolves a single partner selection", () => {
    const view = resolveStatementView(
      {
        kind: "partner",
        mappingId: 1,
        role: "customer",
        cardCode: "C200",
        cardName: "Customer Name",
        partnerCompanyName: "Buyer Co",
      },
      statement,
      2,
    );
    expect(view.balance).toBe(800);
    expect(view.aging.d61_90).toBe(10);
    expect(view.selectedPartner?.cardCode).toBe("C200");
    expect(view.showEmptyPartner).toBe(false);
  });

  it("flags missing statement row for selected partner", () => {
    const view = resolveStatementView(
      {
        kind: "partner",
        mappingId: 9,
        role: "vendor",
        cardCode: "MISSING",
        cardName: null,
        partnerCompanyName: null,
      },
      statement,
      2,
    );
    expect(view.showEmptyPartner).toBe(true);
    expect(view.balance).toBe(0);
    expect(view.aging).toEqual(emptyOverviewAging());
  });
});
