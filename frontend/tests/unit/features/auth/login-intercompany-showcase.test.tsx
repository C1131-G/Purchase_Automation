import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoginIntercompanyShowcase } from "@/features/auth/components/login-intercompany-showcase";

describe("login intercompany showcase", () => {
  it("shows both Flow 2 delivery routes in the destination tile", () => {
    const markup = renderToStaticMarkup(<LoginIntercompanyShowcase />);

    expect(markup).toContain("A/R Invoice Draft");
    expect(markup).toContain("POS Parked Transaction");
    expect(markup).toContain("login-flow2-destination");
  });
});
