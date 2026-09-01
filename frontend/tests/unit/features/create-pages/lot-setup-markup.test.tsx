import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import { LotDocumentRowsTable } from "@/features/create-pages/create-shared/lot-setup/lot-document-rows-table";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

const row: ProductRow = {
  comment: "",
  currency: "FJD",
  discountAmount: 0,
  discountPercent: 0,
  id: "batch-1",
  manBtchNum: "Y",
  price: 12,
  productCode: "BAT-001",
  productName: "Example batch item",
  quantity: 5,
  stock: 5,
  taxRate: 0,
  vatGroup: "",
  warehouseCode: "S101",
};

describe("GRPO lot setup markup", () => {
  it("provides a named native dialog shell when enabled", () => {
    const html = renderToStaticMarkup(
      <AnimatedModalShell dialogLabelledBy="lot-title" nativeDialog onClose={() => {}} open>
        <h2 id="lot-title">Batches</h2>
      </AnimatedModalShell>,
    );

    expect(html).toContain('aria-labelledby="lot-title"');
    expect(html).toContain("<dialog");
    expect(html).toContain('<h2 id="lot-title">Batches</h2>');
  });

  it("exposes a keyboard-accessible document-line selector and table semantics", () => {
    const html = renderToStaticMarkup(
      <LotDocumentRowsTable
        activeRowId={row.id}
        docLabel="New"
        kind="batches"
        onNeededQtyChange={() => {}}
        onSelectRow={() => {}}
        rows={[row]}
      />,
    );

    expect(html).toContain('type="radio"');
    expect(html).toContain('aria-label="Select BAT-001 line"');
    expect(html).toContain('caption class="sr-only">Rows from documents</caption>');
    expect(html).toContain('scope="col"');
  });
});
