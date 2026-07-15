import type { ExportDocumentData } from "./export.types";

export function writePdfDocumentHeader(
  doc: any,
  data: ExportDocumentData,
  pageWidth: number,
): { nextSectionY: number; rightAlignX: number; rightWidth: number } {
  // 1. Top Decorative Brand Bar
  doc.rect(40, 40, pageWidth, 5).fill("#1e3a8a");

  // 2. Header Block
  // Left: Brand & Title
  doc.fontSize(8).font("Helvetica").fillColor("#64748b").text("VENDOR PORTAL", 40, 58);
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#0f172a").text(data.entityLabel, 40, 70);

  // Right: Document Metadata
  const rightAlignX = 380;
  const rightWidth = 175;
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#64748b")
    .text("Document #:", rightAlignX, 58, { width: rightWidth, align: "left" });
  doc
    .font("Helvetica-Bold")
    .fillColor("#0f172a")
    .text(String(data.docNum), rightAlignX + 80, 58, { width: rightWidth - 80, align: "right" });

  // Status Badge
  const statusStr = String(data.docStatus ?? "");
  const isOpen =
    statusStr.toLowerCase().includes("open") || statusStr.toLowerCase().includes("active");
  const isClosed =
    statusStr.toLowerCase().includes("close") || statusStr.toLowerCase().includes("finish");
  const displayStatus = isOpen ? "Open" : isClosed ? "Closed" : statusStr;
  const badgeBg = isOpen ? "#dbeafe" : isClosed ? "#f1f5f9" : "#fee2e2";
  const badgeText = isOpen ? "#1e40af" : isClosed ? "#475569" : "#991b1b";

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#64748b")
    .text("Status:", rightAlignX, 74, { width: rightWidth, align: "left" });

  doc.fontSize(8).font("Helvetica-Bold");
  const statusWidth = doc.widthOfString(displayStatus);
  const badgeW = statusWidth + 12;
  const badgeH = 14;
  const badgeX = 555 - badgeW;

  doc.roundedRect(badgeX, 72, badgeW, badgeH, 3).fill(badgeBg);
  doc
    .fillColor(badgeText)
    .text(displayStatus, badgeX + 6, 75, { width: statusWidth, align: "center" });

  // 3. Grid: Dates & Reference
  const datesY = 105;
  doc.moveTo(40, datesY).lineTo(555, datesY).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

  // Col 1: Doc Date
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#64748b")
    .text("DOCUMENT DATE", 40, datesY + 8);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text(data.docDate || "-", 40, datesY + 18);

  // Col 2: Due Date
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#64748b")
    .text("DUE DATE", 200, datesY + 8);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text(data.docDueDate || "-", 200, datesY + 18);

  // Col 3: Reference
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#64748b")
    .text("REFERENCE / NO. AT CARD", 360, datesY + 8);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text(data.numAtCard || "-", 360, datesY + 18, { width: 195 });

  doc
    .moveTo(40, datesY + 36)
    .lineTo(555, datesY + 36)
    .strokeColor("#cbd5e1")
    .lineWidth(0.5)
    .stroke();

  // 4. Side-by-Side Address Columns: Bill To vs Ship To
  const startY = datesY + 50;

  // BILL TO Block (Left)
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#64748b").text("BILL TO ADDRESS", 40, startY);

  let billToY = startY + 14;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text(`${data.cardCode} - ${data.cardName}`, 40, billToY, { width: 250 });
  billToY = doc.y + 4;

  doc.fontSize(9).font("Helvetica").fillColor("#334155");
  if (data.address) {
    const addrLines = data.address
      .split(/\r?\n|\\n|\\r/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of addrLines) {
      doc.text(line, 40, billToY, { width: 250 });
      billToY = doc.y + 2;
    }
  }
  if (data.salesPersonCode) {
    billToY += 4;
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text("Sales Person: ", 40, billToY, { continued: true });
    doc.font("Helvetica").fillColor("#334155").text(data.salesPersonCode);
    billToY = doc.y + 2;
  }

  // SHIP TO Block (Right)
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#64748b").text("SHIP TO ADDRESS", 305, startY);

  let shipToY = startY + 14;
  doc.fontSize(9).font("Helvetica").fillColor("#334155");
  if (data.address2) {
    const addrLines2 = data.address2
      .split(/\r?\n|\\n|\\r/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of addrLines2) {
      doc.text(line, 305, shipToY, { width: 250 });
      shipToY = doc.y + 2;
    }
  } else {
    doc
      .font("Helvetica-Oblique")
      .fillColor("#94a3b8")
      .text("Same as billing address", 305, shipToY, { width: 250 });
    shipToY = doc.y + 2;
  }

  // Next section starts below the taller block
  const nextSectionY = Math.max(billToY, shipToY) + 20;
  return { nextSectionY, rightAlignX, rightWidth };
}
