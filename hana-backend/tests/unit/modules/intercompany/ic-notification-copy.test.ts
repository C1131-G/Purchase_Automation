import { describe, expect, it } from "vitest";

import {
  formatIcArCreatedMessage,
  formatIcCreatedMessage,
  formatIcCustomerParty,
  formatIcPartyDocMessage,
  formatIcPartyName,
  formatIcPqUpdatedMessage,
  formatIcRfqCreatedMessage,
  formatIcRfqSubmittedMessage,
  formatIcSqCreatedMessage,
  formatIcSubmittedMessage,
  formatIcVendorParty,
} from "@/modules/intercompany/infrastructure/ic-notification-copy";

describe("ic-notification-copy", () => {
  it("formats party as display name only — no Vendor/Customer labels", () => {
    expect(formatIcPartyName("AJAX Industries")).toBe("AJAX Industries");
    expect(formatIcVendorParty("AJAX Industries")).toBe("AJAX Industries");
    expect(formatIcCustomerParty("RCM Trading")).toBe("RCM Trading");
    expect(formatIcPartyName("  ")).toBe("");
    expect(formatIcPartyName(null)).toBe("");
    expect(formatIcVendorParty(null)).toBe("");
    expect(formatIcCustomerParty(undefined)).toBe("");
  });

  it("builds ownership-aware create/submit messages with full company names", () => {
    expect(
      formatIcRfqCreatedMessage({
        buyerCompanyName: "AJAX Industries",
        pqLabel: "PQ No 2042",
        rfqLabel: "RFQ 9001",
        sellerCompanyName: "RCM Trading",
      }),
    ).toBe("RCM Trading: RFQ 9001 created automatically from AJAX Industries PQ No 2042");

    expect(
      formatIcRfqSubmittedMessage({
        rfqLabel: "RFQ 9001",
        sellerCompanyName: "RCM Trading",
      }),
    ).toBe("RCM Trading submitted RFQ 9001");

    expect(
      formatIcPqUpdatedMessage({
        buyerCompanyName: "AJAX Industries",
        pqLabel: "PQ No 2042",
        rfqLabel: "RFQ 9001",
      }),
    ).toBe("AJAX Industries: PQ No 2042 updated from RFQ 9001");

    expect(
      formatIcSqCreatedMessage({
        sellerCompanyName: "RCM Trading",
        sqLabel: "SQ No 810",
      }),
    ).toBe("RCM Trading: SQ No 810 created automatically");

    expect(
      formatIcArCreatedMessage({
        arLabel: "AR Invoice Draft No 55",
        buyerCompanyName: "AJAX Industries",
        poLabel: "PO No 188",
        sellerCompanyName: "RCM Trading",
      }),
    ).toBe(
      "RCM Trading: AR Invoice Draft No 55 created automatically from AJAX Industries PO No 188",
    );
  });

  it("keeps legacy short helpers without Vendor/Customer", () => {
    expect(formatIcCreatedMessage("AJAX Industries", "RFQ 9001")).toBe(
      "AJAX Industries created RFQ 9001",
    );
    expect(formatIcSubmittedMessage("RCM Trading", "RFQ 9001")).toBe(
      "RCM Trading submitted RFQ 9001",
    );
    expect(formatIcPartyDocMessage("AJAX Industries", "PQ No 2042")).toBe(
      "AJAX Industries · PQ No 2042",
    );
    expect(formatIcCreatedMessage("", "RFQ 9001")).toBe("Created RFQ 9001");
    expect(formatIcSubmittedMessage("", "RFQ 9001")).toBe("Submitted RFQ 9001");
    expect(formatIcPartyDocMessage("", "PQ No 2042")).toBe("PQ No 2042");
  });
});
