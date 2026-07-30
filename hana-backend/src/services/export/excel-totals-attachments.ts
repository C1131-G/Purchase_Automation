import type ExcelJS from "exceljs";
import type { ExportDocumentData } from "./export.types";

export function writeExcelTotalsAndAttachments(
  worksheet: ExcelJS.Worksheet,
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
  worksheet.getCell(totalsRowIdx, labelCol).value = "SUMMARY TOTALS";
  worksheet.getCell(totalsRowIdx, labelCol).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF64748B" },
  };
  totalsRowIdx++;

  // Subtotal
  worksheet.getCell(totalsRowIdx, labelCol).value = "Subtotal";
  worksheet.getCell(totalsRowIdx, labelCol).font = {
    name: fontName,
    size: 9,
    color: { argb: "FF64748B" },
  };
  worksheet.getCell(totalsRowIdx, labelCol).alignment = { horizontal: "right" };
  worksheet.getCell(totalsRowIdx, valCol).value = subtotal;
  worksheet.getCell(totalsRowIdx, valCol).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF0F172A" },
  };
  worksheet.getCell(totalsRowIdx, valCol).numFmt = "#,##0.00";
  totalsRowIdx++;

  // Discount
  if (data.discountPercent > 0 || data.discountAmount > 0) {
    const discLabel = data.discountPercent > 0 ? `Discount (${data.discountPercent}%)` : "Discount";
    const discVal =
      data.discountAmount > 0 ? data.discountAmount : (subtotal * data.discountPercent) / 100;

    worksheet.getCell(totalsRowIdx, labelCol).value = discLabel;
    worksheet.getCell(totalsRowIdx, labelCol).font = {
      name: fontName,
      size: 9,
      color: { argb: "FF64748B" },
    };
    worksheet.getCell(totalsRowIdx, labelCol).alignment = { horizontal: "right" };
    worksheet.getCell(totalsRowIdx, valCol).value = -discVal;
    worksheet.getCell(totalsRowIdx, valCol).font = {
      name: fontName,
      size: 9,
      bold: true,
      color: { argb: "FFB91C1C" },
    };
    worksheet.getCell(totalsRowIdx, valCol).numFmt = "-#,##0.00";
    totalsRowIdx++;
  }

  // Underline separator
  worksheet.getCell(totalsRowIdx - 1, valCol).border = {
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  // Grand Total
  worksheet.getCell(totalsRowIdx, labelCol).value = "Grand Total";
  worksheet.getCell(totalsRowIdx, labelCol).font = {
    name: fontName,
    size: 10,
    bold: true,
    color: { argb: "FF0F172A" },
  };
  worksheet.getCell(totalsRowIdx, labelCol).alignment = { horizontal: "right" };
  worksheet.getCell(totalsRowIdx, valCol).value = data.docTotal;
  worksheet.getCell(totalsRowIdx, valCol).font = {
    name: fontName,
    size: 11,
    bold: true,
    color: { argb: "FF1E3A8A" },
  };
  worksheet.getCell(totalsRowIdx, valCol).numFmt = `"${data.docCurr} " #,##0.00`;
  worksheet.getCell(totalsRowIdx, valCol).border = {
    bottom: { style: "double", color: { argb: "FF1E3A8A" } }, // Double underline for accounting
  };

  // Comments (Left side)
  if (data.comments) {
    const commentStartRow = currentRow + 1;
    worksheet.getCell(commentStartRow, 1).value = "COMMENTS & REMARKS";
    worksheet.getCell(commentStartRow, 1).font = {
      name: fontName,
      size: 9,
      bold: true,
      color: { argb: "FF64748B" },
    };

    const mergeRange = `A${commentStartRow + 1}:G${totalsRowIdx}`;
    worksheet.mergeCells(mergeRange);
    const commentCell = worksheet.getCell(`A${commentStartRow + 1}`);
    commentCell.value = data.comments;
    commentCell.font = { name: fontName, size: 9, color: { argb: "FF475569" } };
    commentCell.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    // Draw borders and background for comments merged region
    for (let row = commentStartRow + 1; row <= totalsRowIdx; row++) {
      for (let column = 1; column <= 7; column++) {
        const cell = worksheet.getCell(row, column);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
        cell.border = {
          left: column === 1 ? { style: "medium", color: { argb: "FF3B82F6" } } : undefined,
          top:
            row === commentStartRow + 1
              ? { style: "thin", color: { argb: borderLightColor } }
              : undefined,
          bottom:
            row === totalsRowIdx ? { style: "thin", color: { argb: borderLightColor } } : undefined,
          right: column === 7 ? { style: "thin", color: { argb: borderLightColor } } : undefined,
        };
      }
    }
  }

  // 5. Attachments Section (If present)
  if (data.attachments && data.attachments.length > 0) {
    let attachStartRow = totalsRowIdx + 3;

    worksheet.getCell(attachStartRow, 1).value = "ATTACHMENTS";
    worksheet.getCell(attachStartRow, 1).font = {
      name: fontName,
      size: 9,
      bold: true,
      color: { argb: "FF64748B" },
    };
    attachStartRow++;

    // Table Header
    worksheet.mergeCells(`A${attachStartRow}:D${attachStartRow}`);
    const fnCell = worksheet.getCell(`A${attachStartRow}`);
    fnCell.value = "File Name";

    worksheet.mergeCells(`E${attachStartRow}:I${attachStartRow}`);
    const remCell = worksheet.getCell(`E${attachStartRow}`);
    remCell.value = "Remarks / Note";

    worksheet.mergeCells(`J${attachStartRow}:K${attachStartRow}`);
    const udCell = worksheet.getCell(`J${attachStartRow}`);
    udCell.value = "Uploaded Date";

    [`A${attachStartRow}`, `E${attachStartRow}`, `J${attachStartRow}`].forEach((cellRef, idx) => {
      const cell = worksheet.getCell(cellRef);
      cell.font = { name: fontName, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: idx === 2 ? "center" : "left" };
    });

    for (let column2 = 1; column2 <= 11; column2++) {
      const cell = worksheet.getCell(attachStartRow, column2);
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

      worksheet.mergeCells(`A${attachStartRow}:D${attachStartRow}`);
      worksheet.getCell(`A${attachStartRow}`).value = displayName;

      worksheet.mergeCells(`E${attachStartRow}:I${attachStartRow}`);
      worksheet.getCell(`E${attachStartRow}`).value = remarksText;

      worksheet.mergeCells(`J${attachStartRow}:K${attachStartRow}`);
      worksheet.getCell(`J${attachStartRow}`).value = dateText;

      for (let column3 = 1; column3 <= 11; column3++) {
        const cell = worksheet.getCell(attachStartRow, column3);
        cell.font = { name: fontName, size: 9, color: { argb: "FF334155" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: column3 >= 10 ? "center" : "left",
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
