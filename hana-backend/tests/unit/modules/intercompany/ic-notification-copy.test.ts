import { describe, expect, it } from "vitest";

import {
  formatIcCreatedMessage,
  formatIcCustomerParty,
  formatIcPartyDocMessage,
  formatIcSubmittedMessage,
  formatIcVendorParty,
} from "@/modules/intercompany/infrastructure/ic-notification-copy";

describe("ic-notification-copy", () => {
  it("formats vendor and customer parties with BP codes only", () => {
    expect(formatIcVendorParty("V-B")).toBe("Vendor V-B");
    expect(formatIcCustomerParty("C-A-ON-B")).toBe("Customer C-A-ON-B");
    expect(formatIcVendorParty("  ")).toBe("Vendor");
    expect(formatIcCustomerParty(null)).toBe("Customer");
  });

  it("builds short create/submit/party-doc messages without open-to fluff", () => {
    expect(formatIcCreatedMessage("Customer C-A-ON-B", "RFQ 9001")).toBe(
      "Customer C-A-ON-B created RFQ 9001",
    );
    expect(formatIcSubmittedMessage("Vendor V-B", "RFQ 9001")).toBe(
      "Vendor V-B submitted RFQ 9001",
    );
    expect(formatIcPartyDocMessage("Vendor V-B", "PQ No 2042")).toBe("Vendor V-B · PQ No 2042");
  });
});
