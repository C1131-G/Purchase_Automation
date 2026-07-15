import type { ExportDocumentData } from "./export.types";

export function writePdfLinesTable(
  doc: any,
  data: ExportDocumentData,
  pageWidth: number,
  nextSectionY: number,
): number {
  // 5. Lines Table
  const colWidths = [25, 200, 40, 45, 65, 40, 40, 60];

  function drawTableHeader(y: number) {
    doc.rect(40, y, pageWidth, 20).fill("#1e293b");
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");

    let currentX = 40;
    doc.text("#", currentX + 4, y + 6, { width: colWidths[0], align: "left" });
    currentX += colWidths[0];

    doc.text("Item Details", currentX, y + 6, { width: colWidths[1], align: "left" });
    currentX += colWidths[1];

    doc.text("UoM", currentX, y + 6, { width: colWidths[2], align: "center" });
    currentX += colWidths[2];

    doc.text("Qty", currentX, y + 6, { width: colWidths[3], align: "right" });
    currentX += colWidths[3];

    doc.text("Unit Price", currentX, y + 6, { width: colWidths[4], align: "right" });
    currentX += colWidths[4];

    doc.text("Disc %", currentX, y + 6, { width: colWidths[5], align: "center" });
    currentX += colWidths[5];

    doc.text("Tax %", currentX, y + 6, { width: colWidths[6], align: "center" });
    currentX += colWidths[6];

    doc.text("Line Total", currentX, y + 6, { width: colWidths[7], align: "right" });
  }

  drawTableHeader(nextSectionY);
  let lineY = nextSectionY + 20;
  let isAlternate = false;

  for (const line of data.lines) {
    doc.fontSize(7).font("Helvetica");
    const descHeight = line.itemDescription
      ? doc.heightOfString(line.itemDescription, { width: colWidths[1] })
      : 0;

    // Row height = padding (12) + item code height (8) + spacing (2) + description height
    const rowHeight = 12 + 8 + (descHeight ? descHeight + 2 : 0);

    // If row exceeds page printable height, insert a page break and redraw table header
    if (lineY + rowHeight > doc.page.height - 60) {
      doc.addPage();
      lineY = 40;
      drawTableHeader(lineY);
      lineY += 20;
    }

    // Zebra striping
    if (isAlternate) {
      doc.rect(40, lineY, pageWidth, rowHeight).fill("#f8fafc");
    }

    // Draw Column Values
    let currentX = 40;

    // Line Num
    doc.fontSize(8).font("Helvetica").fillColor("#64748b");
    doc.text(String(line.lineNum + 1), currentX + 4, lineY + 6, {
      width: colWidths[0],
      align: "left",
    });
    currentX += colWidths[0];

    // Item Details (Item Code + Description)
    doc
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text(line.itemCode, currentX, lineY + 6, { width: colWidths[1] });
    if (line.itemDescription) {
      doc
        .font("Helvetica")
        .fillColor("#64748b")
        .text(line.itemDescription, currentX, lineY + 15, { width: colWidths[1] });
    }
    currentX += colWidths[1];

    // UoM
    doc
      .font("Helvetica")
      .fillColor("#334155")
      .text(line.uomCode || "-", currentX, lineY + 6, { width: colWidths[2], align: "center" });
    currentX += colWidths[2];

    // Qty
    doc.text(String(line.quantity), currentX, lineY + 6, { width: colWidths[3], align: "right" });
    currentX += colWidths[3];

    // Unit Price
    doc.text(line.unitPrice.toFixed(2), currentX, lineY + 6, {
      width: colWidths[4],
      align: "right",
    });
    currentX += colWidths[4];

    // Discount Percent
    doc.text(`${line.discountPercent}%`, currentX, lineY + 6, {
      width: colWidths[5],
      align: "center",
    });
    currentX += colWidths[5];

    // Tax Rate
    doc.text(`${line.taxRate}%`, currentX, lineY + 6, { width: colWidths[6], align: "center" });
    currentX += colWidths[6];

    // Line Total
    doc
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text(line.lineTotal.toFixed(2), currentX, lineY + 6, {
        width: colWidths[7],
        align: "right",
      });

    // Bottom Border for the row
    doc
      .moveTo(40, lineY + rowHeight)
      .lineTo(555, lineY + rowHeight)
      .strokeColor("#f1f5f9")
      .lineWidth(0.5)
      .stroke();

    lineY += rowHeight;
    isAlternate = !isAlternate;
  }
  return lineY;
}
