// Excel generator: Styled .xlsx with brand header, address, zebra table, totals, and attachments.

import Excel from "exceljs";
import type { ExportDocumentData } from "./types";

const FONT = { name: "Calibri", size: 11 };
const FONT_BOLD = { name: "Calibri", size: 11, bold: true };
const ACCENT_COLOR = "1F4E79";
const HEADER_BG = ACCENT_COLOR;
const HEADER_FG = "FFFFFF";
const ZEBRA_LIGHT = "F2F7FB";
const BORDER = { style: "thin" as const, color: { argb: "D0D0D0" } };

const addBorder = (cell: Excel.Cell) => {
  cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
};

export const generateExcel = async (data: ExportDocumentData): Promise<Buffer> => {
  const wb = new Excel.Workbook();
  const ws = wb.addWorksheet(`${data.title}_${data.docNum}`);

  // Column widths
  ws.columns = [
    { key: "lineNum", width: 8 },
    { key: "itemCode", width: 18 },
    { key: "description", width: 30 },
    { key: "quantity", width: 12 },
    { key: "uom", width: 8 },
    { key: "price", width: 14 },
    { key: "total", width: 16 },
    { key: "warehouse", width: 14 },
    { key: "taxCode", width: 10 },
  ];

  // Brand header
  ws.mergeCells("A1:I1");
  const brand = ws.getCell("A1");
  brand.value = "VENDOR PORTAL";
  brand.font = { ...FONT_BOLD, size: 16, color: { argb: HEADER_FG } };
  brand.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_COLOR } };
  brand.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // Title
  ws.mergeCells("A2:I2");
  const title = ws.getCell("A2");
  title.value = `${data.title} #${data.docNum}`;
  title.font = { ...FONT_BOLD, size: 14 };
  title.alignment = { horizontal: "center" };
  ws.getRow(2).height = 28;

  // Address block
  ws.mergeCells("A3:C3");
  ws.mergeCells("D3:F3");
  ws.mergeCells("G3:I3");
  ws.getCell("A3").value = `Vendor: ${data.cardCode} - ${data.cardName}`;
  ws.getCell("D3").value = `Date: ${data.docDate}`;
  ws.getCell("G3").value = `Status: ${data.docStatus}`;
  ws.getRow(3).font = FONT;
  ws.getRow(3).height = 20;

  if (data.address) {
    ws.mergeCells("A4:I4");
    ws.getCell("A4").value = `Address: ${data.address}`;
    ws.getRow(4).font = FONT;
  }

  // Blank row before table
  const headerRowNum = data.address ? 6 : 5;
  const headerRow = ws.getRow(headerRowNum);

  // Table headers
  const headers = ["#", "Item Code", "Description", "Qty", "UOM", "Price", "Total", "Whs", "Tax"];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { ...FONT_BOLD, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center" };
    addBorder(cell);
  });
  headerRow.height = 22;

  // Data rows with zebra striping
  data.lines.forEach((line, i) => {
    const rowNum = headerRowNum + 1 + i;
    const row = ws.getRow(rowNum);
    row.values = [
      line.lineNum,
      line.itemCode,
      line.itemDescription,
      line.quantity,
      line.uom,
      line.price,
      line.total,
      line.warehouse,
      line.taxCode,
    ];
    row.font = FONT;
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_LIGHT } };
      });
    }
    row.eachCell(addBorder);
    row.getCell(4).alignment = { horizontal: "right" };
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(7).alignment = { horizontal: "right" };
  });

  // Totals row
  const totalRowNum = headerRowNum + 1 + data.lines.length;
  const totalRow = ws.getRow(totalRowNum);
  ws.mergeCells(totalRowNum, 1, totalRowNum, 6);
  totalRow.getCell(1).value = `Total (${data.docCurrency})`;
  totalRow.getCell(1).font = FONT_BOLD;
  totalRow.getCell(1).alignment = { horizontal: "right" };
  totalRow.getCell(7).value = data.docTotal;
  totalRow.getCell(7).font = FONT_BOLD;
  totalRow.getCell(7).alignment = { horizontal: "right" };
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8EEF4" } };
    addBorder(cell);
  });
  totalRow.height = 24;

  // Comments
  let currentRow = totalRowNum + 1;
  if (data.comments) {
    ws.mergeCells(currentRow, 1, currentRow, 9);
    ws.getCell(currentRow, 1).value = `Comments: ${data.comments}`;
    ws.getRow(currentRow).font = { ...FONT, italic: true };
    currentRow++;
  }

  // Attachments section
  if (data.attachments.length > 0) {
    currentRow++;
    ws.mergeCells(currentRow, 1, currentRow, 9);
    ws.getCell(currentRow, 1).value = "Attachments:";
    ws.getCell(currentRow, 1).font = FONT_BOLD;
    currentRow++;

    data.attachments.forEach((a) => {
      ws.mergeCells(currentRow, 1, currentRow, 9);
      ws.getCell(currentRow, 1).value =
        `  ${a.fileName}.${a.fileExtension}${a.freeText ? ` — ${a.freeText}` : ""}`;
      ws.getRow(currentRow).font = FONT;
      currentRow++;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
