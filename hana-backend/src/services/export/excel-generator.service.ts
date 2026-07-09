// Excel document generator using exceljs.

import ExcelJS from "exceljs";
import type { ExportDocumentData } from "./types";

export async function generateExcel(data: ExportDocumentData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vendor Portal";
  wb.created = new Date();

  const ws = wb.addWorksheet(data.entityLabel);

  // Enable gridlines
  ws.views = [{ showGridLines: true }];

  // Column definitions (no headers here, we write them manually to avoid writing to row 1)
  const columnsDef = [
    { key: "lineNum", width: 6 }, // A
    { key: "itemCode", width: 18 }, // B
    { key: "itemDescription", width: 35 }, // C
    { key: "uomCode", width: 8 }, // D
    { key: "quantity", width: 12 }, // E
    { key: "unitPrice", width: 14 }, // F
    { key: "discountPercent", width: 12 }, // G
    { key: "taxRate", width: 10 }, // H
    { key: "taxCode", width: 10 }, // I
    { key: "lineTotal", width: 16 }, // J
    { key: "warehouseCode", width: 14 }, // K
  ];

  columnsDef.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width;
  });

  const fontName = "Segoe UI";
  const borderLightColor = "FFE2E8F0";

  // 1. Title Block (Row 2)
  ws.mergeCells("A2:K2");
  const titleCell = ws.getCell("A2");
  titleCell.value = data.entityLabel;
  titleCell.font = { name: fontName, size: 16, bold: true, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(2).height = 30;

  // 2. Info details & Addresses Block (Rows 4-9)
  const startRow = 4;

  // A: DOCUMENT DETAILS
  ws.getCell(`A${startRow}`).value = "DOCUMENT DETAILS";
  ws.getCell(`A${startRow}`).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF64748B" },
  };

  const infoFields = [
    ["Document #:", String(data.docNum)],
    [
      "Status:",
      data.docStatus.toLowerCase().includes("open")
        ? "Open"
        : data.docStatus.toLowerCase().includes("close")
          ? "Closed"
          : data.docStatus,
    ],
    ["Doc Date:", data.docDate],
    ["Due Date:", data.docDueDate],
    ["Reference:", data.numAtCard || "-"],
  ];

  infoFields.forEach(([label, val], idx) => {
    const rowIdx = startRow + 1 + idx;
    ws.getCell(`A${rowIdx}`).value = label;
    ws.getCell(`A${rowIdx}`).font = {
      name: fontName,
      size: 9,
      bold: true,
      color: { argb: "FF475569" },
    };
    ws.getCell(`B${rowIdx}`).value = val;
    ws.getCell(`B${rowIdx}`).font = { name: fontName, size: 9, color: { argb: "FF0F172A" } };
  });

  // D: BILL TO ADDRESS
  ws.getCell(`D${startRow}`).value = "BILL TO ADDRESS";
  ws.getCell(`D${startRow}`).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF64748B" },
  };

  ws.getCell(`D${startRow + 1}`).value = `${data.cardCode} - ${data.cardName}`;
  ws.getCell(`D${startRow + 1}`).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF0F172A" },
  };

  let billToIdx = startRow + 2;
  if (data.address) {
    const addrLines = data.address
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    addrLines.forEach((line) => {
      if (billToIdx <= startRow + 5) {
        ws.getCell(`D${billToIdx}`).value = line;
        ws.getCell(`D${billToIdx}`).font = { name: fontName, size: 9, color: { argb: "FF334155" } };
        billToIdx++;
      }
    });
  }
  if (data.salesPersonCode && billToIdx <= startRow + 5) {
    ws.getCell(`D${billToIdx}`).value = `Sales Person: ${data.salesPersonCode}`;
    ws.getCell(`D${billToIdx}`).font = {
      name: fontName,
      size: 9,
      italic: true,
      color: { argb: "FF475569" },
    };
  }

  // H: SHIP TO ADDRESS
  ws.getCell(`H${startRow}`).value = "SHIP TO ADDRESS";
  ws.getCell(`H${startRow}`).font = {
    name: fontName,
    size: 9,
    bold: true,
    color: { argb: "FF64748B" },
  };

  let shipToIdx = startRow + 1;
  if (data.address2) {
    const addrLines2 = data.address2
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    addrLines2.forEach((line) => {
      if (shipToIdx <= startRow + 5) {
        ws.getCell(`H${shipToIdx}`).value = line;
        ws.getCell(`H${shipToIdx}`).font = { name: fontName, size: 9, color: { argb: "FF334155" } };
        shipToIdx++;
      }
    });
  } else {
    ws.getCell(`H${shipToIdx}`).value = "Same as billing address";
    ws.getCell(`H${shipToIdx}`).font = {
      name: fontName,
      size: 9,
      italic: true,
      color: { argb: "FF94A3B8" },
    };
  }

  // 3. Table Section
  const tableHeaderRowIdx = 11;
  const tableHeaderRow = ws.getRow(tableHeaderRowIdx);
  tableHeaderRow.height = 24;

  const headers = [
    "#",
    "Item Code",
    "Description",
    "UoM",
    "Quantity",
    "Unit Price",
    "Discount %",
    "Tax %",
    "Tax Code",
    "Line Total",
    "Warehouse",
  ];

  headers.forEach((header, colIdx) => {
    const cell = tableHeaderRow.getCell(colIdx + 1);
    cell.value = header;
    cell.font = { name: fontName, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Slate 900
    };
    cell.alignment = {
      vertical: "middle",
      horizontal:
        colIdx === 0 || colIdx === 1 || colIdx === 10 ? "center" : colIdx === 2 ? "left" : "right",
    };
  });

  // Table Data
  let currentRow = tableHeaderRowIdx + 1;
  let isAlternate = false;

  for (const line of data.lines) {
    const r = ws.getRow(currentRow);
    r.height = 20;

    const cellsData = [
      line.lineNum + 1,
      line.itemCode,
      line.itemDescription,
      line.uomCode || "-",
      line.quantity,
      line.unitPrice,
      line.discountPercent / 100, // display as actual fraction for percentage formatting
      line.taxRate / 100,
      line.taxCode || "-",
      line.lineTotal,
      line.warehouseCode || "-",
    ];

    cellsData.forEach((val, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: fontName, size: 9, color: { argb: "FF334155" } };

      // Formatting and Alignment
      if (colIdx === 0 || colIdx === 1 || colIdx === 3 || colIdx === 8 || colIdx === 10) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colIdx === 2) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }

      if (colIdx === 4) cell.numFmt = "#,##0";
      if (colIdx === 5 || colIdx === 9) cell.numFmt = "#,##0.00";
      if (colIdx === 6 || colIdx === 7) cell.numFmt = "0.0%";

      // Zebra striping
      if (isAlternate) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      // Borders
      cell.border = {
        top: { style: "thin", color: { argb: borderLightColor } },
        bottom: { style: "thin", color: { argb: borderLightColor } },
      };
    });

    currentRow++;
    isAlternate = !isAlternate;
  }

  // Draw end-of-table bottom border
  for (let c = 1; c <= 11; c++) {
    const cell = ws.getCell(currentRow - 1, c);
    cell.border = {
      ...cell.border,
      bottom: { style: "medium", color: { argb: "FFCBD5E1" } },
    };
  }

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

  const buffer = await wb.xlsx.writeBuffer();
  return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
}
