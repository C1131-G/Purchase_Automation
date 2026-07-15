import type ExcelJS from "exceljs";
import type { ExportDocumentData } from "./export.types";

export function writeExcelTotalsAndAttachments(
  ws: ExcelJS.Worksheet,
  data: ExportDocumentData,
  fontName: string,
  borderLightColor: string,
  currentRow: number,
): void {
  // 4. Comments and Totals (Side-by-Side)
  let totalsRowIdx = currentRow + 1;
  const labelCol = 9; // I
  const valCol = 10; // J

  let subtotal = 0;
  for (const line of data.lines) {
    subtotal += line.lineTotal;
  }

  // Summary Totals Title
  ws.getCell(totalsRowIdx, labelCol).value = "SUMMARY TOTALS";
  ws.getCell(totalsRowIdx, labelCol).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF64748B" },
  };
  totalsRowIdx++;

  // Subtotal
  ws.getCell(totalsRowIdx, labelCol).value = "Subtotal";
  ws.getCell(totalsRowIdx, labelCol).font = {
    name: fontName,
    size: 9,
    color: { argb: "FF64748B" },
  };
  ws.getCell(totalsRowIdx, labelCol).alignment = { horizontal: "right" };
  ws.getCell(totalsRowIdx, valCol).value = subtotal;
  ws.getCell(totalsRowIdx, valCol).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF0F172A" },
  };
  ws.getCell(totalsRowIdx, valCol).numFmt = "#,##0.00";
  totalsRowIdx++;

  // Discount
  if (data.discountPercent > 0 || data.discountAmount > 0) {
    const discLabel = data.discountPercent > 0 ? `Discount (${data.discountPercent}%)` : "Discount";
    const discVal =
      data.discountAmount > 0 ? data.discountAmount : (subtotal * data.discountPercent) / 100;

    ws.getCell(totalsRowIdx, labelCol).value = discLabel;
    ws.getCell(totalsRowIdx, labelCol).font = {
      name: fontName,
      size: 9,
      color: { argb: "FF64748B" },
    };
    ws.getCell(totalsRowIdx, labelCol).alignment = { horizontal: "right" };
    ws.getCell(totalsRowIdx, valCol).value = -discVal;
    ws.getCell(totalsRowIdx, valCol).font = {
      name: fontName,
      size: 9,
      bold: true,
      color: { argb: "FFB91C1C" },
    };
    ws.getCell(totalsRowIdx, valCol).numFmt = "-#,##0.00";
    totalsRowIdx++;
  }

  // Underline separator
  ws.getCell(totalsRowIdx - 1, valCol).border = {
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  // Grand Total
  ws.getCell(totalsRowIdx, labelCol).value = "Grand Total";
  ws.getCell(totalsRowIdx, labelCol).font = {
    name: fontName,
    size: 10,
    bold: true,
    color: { argb: "FF0F172A" },
  };
  ws.getCell(totalsRowIdx, labelCol).alignment = { horizontal: "right" };
  ws.getCell(totalsRowIdx, valCol).value = data.docTotal;
  ws.getCell(totalsRowIdx, valCol).font = {
    name: fontName,
    size: 11,
    bold: true,
    color: { argb: "FF1E3A8A" },
  };
  ws.getCell(totalsRowIdx, valCol).numFmt = `"${data.docCurr || ""} " #,##0.00`;
  ws.getCell(totalsRowIdx, valCol).border = {
    bottom: { style: "double", color: { argb: "FF1E3A8A" } }, // Double underline for accounting
  };

  // Comments (Left side)
  if (data.comments) {
    const commentStartRow = currentRow + 1;
    ws.getCell(commentStartRow, 1).value = "COMMENTS & REMARKS";
    ws.getCell(commentStartRow, 1).font = {
      name: fontName,
      size: 9,
      bold: true,
      color: { argb: "FF64748B" },
    };

    const mergeRange = `A${commentStartRow + 1}:G${totalsRowIdx}`;
    ws.mergeCells(mergeRange);
    const commentCell = ws.getCell(`A${commentStartRow + 1}`);
    commentCell.value = data.comments;
    commentCell.font = { name: fontName, size: 9, color: { argb: "FF475569" } };
    commentCell.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    // Draw borders and background for comments merged region
    for (let r = commentStartRow + 1; r <= totalsRowIdx; r++) {
      for (let c = 1; c <= 7; c++) {
        const cell = ws.getCell(r, c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
        cell.border = {
          left: c === 1 ? { style: "medium", color: { argb: "FF3B82F6" } } : undefined,
          top:
            r === commentStartRow + 1
              ? { style: "thin", color: { argb: borderLightColor } }
              : undefined,
          bottom:
            r === totalsRowIdx ? { style: "thin", color: { argb: borderLightColor } } : undefined,
          right: c === 7 ? { style: "thin", color: { argb: borderLightColor } } : undefined,
        };
      }
    }
  }

  // 5. Attachments Section (If present)
  if (data.attachments && data.attachments.length > 0) {
    let attachStartRow = totalsRowIdx + 3;

    ws.getCell(attachStartRow, 1).value = "ATTACHMENTS";
    ws.getCell(attachStartRow, 1).font = {
      name: fontName,
      size: 9,
      bold: true,
      color: { argb: "FF64748B" },
    };
    attachStartRow++;

    // Table Header
    ws.mergeCells(`A${attachStartRow}:D${attachStartRow}`);
    const fnCell = ws.getCell(`A${attachStartRow}`);
    fnCell.value = "File Name";

    ws.mergeCells(`E${attachStartRow}:I${attachStartRow}`);
    const remCell = ws.getCell(`E${attachStartRow}`);
    remCell.value = "Remarks / Note";

    ws.mergeCells(`J${attachStartRow}:K${attachStartRow}`);
    const udCell = ws.getCell(`J${attachStartRow}`);
    udCell.value = "Uploaded Date";

    [`A${attachStartRow}`, `E${attachStartRow}`, `J${attachStartRow}`].forEach((cellRef, idx) => {
      const cell = ws.getCell(cellRef);
      cell.font = { name: fontName, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: idx === 2 ? "center" : "left" };
    });

    for (let c = 1; c <= 11; c++) {
      const cell = ws.getCell(attachStartRow, c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF475569" },
      };
    }
    attachStartRow++;

    let isAlternateAtt = false;
    for (const att of data.attachments) {
      const displayName =
        att.fileName.substring(att.fileName.lastIndexOf("_") + 1) +
        (att.fileExtension ? `.${att.fileExtension}` : "");
      const remarksText = att.freeText || "-";
      const rawDate = att.attachmentDate || "-";
      const dateText = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;

      ws.mergeCells(`A${attachStartRow}:D${attachStartRow}`);
      ws.getCell(`A${attachStartRow}`).value = displayName;

      ws.mergeCells(`E${attachStartRow}:I${attachStartRow}`);
      ws.getCell(`E${attachStartRow}`).value = remarksText;

      ws.mergeCells(`J${attachStartRow}:K${attachStartRow}`);
      ws.getCell(`J${attachStartRow}`).value = dateText;

      for (let c = 1; c <= 11; c++) {
        const cell = ws.getCell(attachStartRow, c);
        cell.font = { name: fontName, size: 9, color: { argb: "FF334155" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: c >= 10 ? "center" : "left",
        };

        if (isAlternateAtt) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }

        cell.border = {
          top: { style: "thin", color: { argb: borderLightColor } },
          bottom: { style: "thin", color: { argb: borderLightColor } },
        };
      }

      attachStartRow++;
      isAlternateAtt = !isAlternateAtt;
    }
  }
}
