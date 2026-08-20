import { describe, expect, it } from "vitest";

import AppError from "@/core/errors/app-error";
import { formatPortalCreatedBy, requirePortalCreatedBy } from "@/modules/auth/portal-created-by";

describe("portal document creator", () => {
  it("formats the canonical portal username with one prefix", () => {
    expect(formatPortalCreatedBy(" Vedha1 ")).toBe("Portal_Vedha1");
    expect(formatPortalCreatedBy("Portal_Vedha1")).toBe("Portal_Vedha1");
    expect(formatPortalCreatedBy("portal_Vedha1")).toBe("Portal_Vedha1");
  });

  it("preserves username case", () => {
    expect(formatPortalCreatedBy("VeDhA1")).toBe("Portal_VeDhA1");
  });

  it("requires a canonical username from the session", () => {
    expect(() => requirePortalCreatedBy({})).toThrow(AppError);
  });
});
