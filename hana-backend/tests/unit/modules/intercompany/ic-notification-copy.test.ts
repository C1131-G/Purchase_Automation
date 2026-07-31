import { describe, expect, it } from "vitest";

import {
  formatIcCreatedMessage,
  formatIcCustomerParty,
  formatIcPartyDocMessage,
  formatIcPartyName,
  formatIcSubmittedMessage,
  formatIcVendorParty,
} from "@/modules/intercompany/infrastructure/ic-notification-copy";

describe("ic-notification-copy", () => {
  it("formats party as CardName only — no Vendor/Customer labels", () => {
    expect(formatIcPartyName("AJAX Industries")).toBe("AJAX Industries");
    expect(formatIcVendorParty("AJAX Industries")).toBe("AJAX Industries");
    expect(formatIcCustomerParty("RCM Trading")).toBe("RCM Trading");
    expect(formatIcPartyName("  ")).toBe("");
    expect(formatIcPartyName(null)).toBe("");
    expect(formatIcVendorParty(null)).toBe("");
    expect(formatIcCustomerParty(undefined)).toBe("");
  });

  it("builds short create/submit/party-doc messages without Vendor/Customer", () => {
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
