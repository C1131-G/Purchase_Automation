import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 36,
    getVirtualItems: () => [{ index: 0, key: 0, size: 36, start: 0 }],
  }),
}));

import { FieldBlock } from "@/features/create-pages/create-shared/components/core/field-block";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";

describe("location lookup controls", () => {
  it("names the warehouse lookup button", () => {
    const markup = renderToStaticMarkup(
      <FieldBlock
        label="Warehouse"
        placeholder="Select Warehouse"
        value=""
        onChange={vi.fn()}
        onFocus={vi.fn()}
        onBlur={vi.fn()}
        onOpenPopup={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Open Warehouse lookup"');
  });

  it("renders suggestion results as native buttons", () => {
    const markup = renderToStaticMarkup(
      <SuggestionList
        items={[{ code: "L101", name: "Lautoka Main Warehouse" }]}
        onSelect={vi.fn()}
        showCode
      />,
    );

    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Lautoka Main Warehouse (L101)"');
  });
});
