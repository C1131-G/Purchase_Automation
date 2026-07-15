import type ExcelJS from "exceljs";
import type { ExportDocumentData } from "./export.types";

export function writeExcelLinesTable(
  ws: ExcelJS.Worksheet,
  data: ExportDocumentData,
  fontName: string,
  borderLightColor: string,
): number {
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
  return currentRow;
}
