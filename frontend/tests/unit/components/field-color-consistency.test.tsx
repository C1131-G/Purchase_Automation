import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Input } from "@/components/input/input";
import { Select } from "@/components/select/select";
import { FieldBlock } from "@/features/create-pages/create-shared/components/core/field-block";

describe("field color consistency", () => {
  it("keeps disabled and read-only inputs silver without fading", () => {
    const markup = renderToStaticMarkup(<Input disabled value="Locked" readOnly />);

    expect(markup).toContain("bg-field-silver");
    expect(markup).not.toContain("disabled:opacity-50");
    expect(markup).not.toContain("bg-linen-100");
  });

  it("keeps disabled select triggers silver without fading", () => {
    const markup = renderToStaticMarkup(
      <Select disabled value="locked">
        <Select.Trigger>Locked</Select.Trigger>
      </Select>,
    );

    expect(markup).toContain("bg-field-silver");
    expect(markup).not.toContain("opacity-50");
    expect(markup).not.toContain("bg-linen-100");
  });

  it("uses silver for locked create-page fields by default", () => {
    const markup = renderToStaticMarkup(
      <FieldBlock
        disabled
        label="Warehouse"
        onBlur={vi.fn()}
        onChange={vi.fn()}
        onFocus={vi.fn()}
        placeholder="Warehouse"
        value="Main"
      />,
    );

    expect(markup).toContain("cursor-not-allowed");
    expect(markup).toContain("bg-field-silver");
    expect(markup).not.toContain("bg-linen-100 text-neutral-500");
  });
});
