import { describe, expect, it } from "vitest";

import { toStatementPartnerTableLink } from "@/features/dashboard/utils/statement-partner-table-link";

describe("toStatementPartnerTableLink", () => {
  it("routes vendors to open A/P invoices with CardCode filter", () => {
    const link = toStatementPartnerTableLink("vendor", "V001");

    expect(link.to).toBe("/purchase/ap-invoice");
    expect(link.search).toEqual({
      DocStatus: "Open",
      page: 1,
      CardCode: "V001",
      columnFilters: [
        { id: "DocStatus", value: "Open" },
        { id: "CardCode", value: "V001" },
      ],
    });
  });

  it("routes customers to open sales quotations with CardCode filter", () => {
    const link = toStatementPartnerTableLink("customer", "C001");

    expect(link.to).toBe("/sales/quotations");
    expect(link.search).toEqual({
      DocStatus: "Open",
      page: 1,
      CardCode: "C001",
      columnFilters: [
        { id: "DocStatus", value: "Open" },
        { id: "CardCode", value: "C001" },
      ],
    });
  });
});
