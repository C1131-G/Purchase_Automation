// PDF document generator using pdfkit.

import PDFDocument from "pdfkit";
import type { ExportDocumentData } from "./types";

export async function generatePdf(data: ExportDocumentData): Promise<Buffer> {
  // Use bufferPages: true to enable page counts in header/footer
  // Set bottom margin to 0 to disable automatic pagination and prevent empty pages
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 0, left: 40, right: 40 },
    bufferPages: true,
  });
  const buffers: Buffer[] = [];

  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width - 80; // A4 width is 595.28; printable area = 515.28

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
      .map((l) => l.trim())
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
      .map((l) => l.trim())
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

  // 6. Comments & Summary Totals (Side-by-Side below the table)
  let subtotal = 0;
  for (const line of data.lines) {
    subtotal += line.lineTotal;
  }

  const totalsX = 350;
  const totalsW = 205;
  const commentW = 290;

  // Estimate comments height if present
  let commentsHeight = 0;
  if (data.comments) {
    doc.fontSize(8).font("Helvetica");
    commentsHeight = doc.heightOfString(data.comments, { width: commentW - 20 }) + 36;
  }

  // Totals height estimate: Subtotal (15) + Discount (15, optional) + Border (8) + Grand Total (20) = 58
  const totalsHeight = 58 + (data.discountPercent > 0 || data.discountAmount > 0 ? 15 : 0);
  const sectionHeight = Math.max(commentsHeight, totalsHeight);

  // Check if it fits on current page
  if (lineY + sectionHeight > doc.page.height - 60) {
    doc.addPage();
    lineY = 40;
  }

  let totalsY = lineY + 15;

  // Render Summary Totals Title
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#64748b")
    .text("SUMMARY TOTALS", totalsX, lineY + 2);
  totalsY += 12;

  // Subtotal
  doc.fontSize(9).font("Helvetica").fillColor("#64748b").text("Subtotal", totalsX, totalsY);
  doc
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text(`${data.docCurr || ""} ${subtotal.toFixed(2)}`, totalsX + 80, totalsY, {
      align: "right",
      width: totalsW - 80,
    });
  totalsY = doc.y + 4;

  if (data.discountPercent > 0 || data.discountAmount > 0) {
    const discLabel = data.discountPercent > 0 ? `Discount (${data.discountPercent}%)` : "Discount";
    const discVal =
      data.discountAmount > 0 ? data.discountAmount : (subtotal * data.discountPercent) / 100;
    doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(discLabel, totalsX, totalsY);
    doc
      .font("Helvetica-Bold")
      .fillColor("#b91c1c")
      .text(`- ${data.docCurr || ""} ${discVal.toFixed(2)}`, totalsX + 80, totalsY, {
        align: "right",
        width: totalsW - 80,
      });
    totalsY = doc.y + 4;
  }

  // Draw thin border under intermediate totals
  doc
    .moveTo(totalsX, totalsY + 2)
    .lineTo(555, totalsY + 2)
    .strokeColor("#cbd5e1")
    .lineWidth(0.5)
    .stroke();
  totalsY += 8;

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text("Grand Total", totalsX, totalsY);
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#1e3a8a")
    .text(`${data.docCurr || ""} ${data.docTotal.toFixed(2)}`, totalsX + 80, totalsY - 2, {
      align: "right",
      width: totalsW - 80,
    });
  totalsY = doc.y + 10;

  // Render Comments (Left)
  let commentsY = lineY + 2;
  if (data.comments) {
    doc.roundedRect(40, commentsY, commentW, commentsHeight - 10, 4).fill("#f8fafc");
    doc.rect(40, commentsY, 4, commentsHeight - 10).fill("#3b82f6");

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text("Comments & Remarks", 54, commentsY + 6);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#475569")
      .text(data.comments, 54, commentsY + 18, { width: commentW - 30 });
    commentsY += commentsHeight;
  }

  // 7. Attachments Section (If present)
  let attachmentsY = Math.max(totalsY, commentsY) + 20;
  if (data.attachments && data.attachments.length > 0) {
    if (attachmentsY + 40 > doc.page.height - 60) {
      doc.addPage();
      attachmentsY = 40;
    }

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#64748b")
      .text("ATTACHMENTS", 40, attachmentsY);
    attachmentsY += 12;

    doc.rect(40, attachmentsY, pageWidth, 16).fill("#475569");
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");

    doc.text("File Name", 45, attachmentsY + 4, { width: 200, align: "left" });
    doc.text("Remarks / Note", 250, attachmentsY + 4, { width: 215, align: "left" });
    doc.text("Uploaded Date", 470, attachmentsY + 4, { width: 80, align: "right" });
    attachmentsY += 16;

    let isAlternateAtt = false;
    for (const att of data.attachments) {
      const displayName =
        att.fileName.substring(att.fileName.lastIndexOf("_") + 1) +
        (att.fileExtension ? `.${att.fileExtension}` : "");

      const remarksText = att.freeText || "-";
      const rawDate = att.attachmentDate || "-";
      const dateText = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;

      doc.fontSize(7).font("Helvetica");
      const nameHeight = doc.heightOfString(displayName, { width: 195 });
      const remarksHeight = doc.heightOfString(remarksText, { width: 210 });
      const attRowHeight = Math.max(nameHeight, remarksHeight) + 8;

      if (attachmentsY + attRowHeight > doc.page.height - 60) {
        doc.addPage();
        attachmentsY = 40;
        doc.rect(40, attachmentsY, pageWidth, 16).fill("#475569");
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text("File Name", 45, attachmentsY + 4, { width: 200, align: "left" });
        doc.text("Remarks / Note", 250, attachmentsY + 4, { width: 215, align: "left" });
        doc.text("Uploaded Date", 470, attachmentsY + 4, { width: 80, align: "right" });
        attachmentsY += 16;
      }

      if (isAlternateAtt) {
        doc.rect(40, attachmentsY, pageWidth, attRowHeight).fill("#f8fafc");
      }

      doc.fontSize(8).font("Helvetica").fillColor("#1e293b");
      doc.text(displayName, 45, attachmentsY + 4, { width: 195, align: "left" });
      doc.text(remarksText, 250, attachmentsY + 4, { width: 210, align: "left" });
      doc.text(dateText, 470, attachmentsY + 4, { width: 80, align: "right" });

      doc
        .moveTo(40, attachmentsY + attRowHeight)
        .lineTo(555, attachmentsY + attRowHeight)
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .stroke();

      attachmentsY += attRowHeight;
      isAlternateAtt = !isAlternateAtt;
    }
  }

  // 8. Dynamic Footer (Page Numbers)
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Thin footer separator line
    doc
      .moveTo(40, doc.page.height - 40)
      .lineTo(555, doc.page.height - 40)
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .stroke();

    // Footer Text
    doc.fontSize(8).font("Helvetica").fillColor("#94a3b8");
    doc.text("Vendor Portal — Confidential Document", 40, doc.page.height - 32);

    doc.text(`Page ${i + 1} of ${range.count}`, rightAlignX, doc.page.height - 32, {
      align: "right",
      width: rightWidth,
    });
  }

  doc.end();

  return pdfPromise;
}
