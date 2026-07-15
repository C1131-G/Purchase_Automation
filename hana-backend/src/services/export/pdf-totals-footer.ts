import type { ExportDocumentData } from "./export.types";

export function writePdfTotalsAttachmentsAndFooter(
  doc: any,
  data: ExportDocumentData,
  pageWidth: number,
  lineY: number,
  rightAlignX: number,
  rightWidth: number,
): void {
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
}
