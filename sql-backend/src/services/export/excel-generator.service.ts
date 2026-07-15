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
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet(`${data.title}_${data.docNum}`);

  // Column widths
  worksheet.columns = [
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
  worksheet.mergeCells("A1:I1");
  const brand = worksheet.getCell("A1");
  brand.value = "VENDOR PORTAL";
  brand.font = { ...FONT_BOLD, size: 16, color: { argb: HEADER_FG } };
  brand.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_COLOR } };
  brand.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 36;

  // Title
  worksheet.mergeCells("A2:I2");
  const title = worksheet.getCell("A2");
  title.value = `${data.title} #${data.docNum}`;
  title.font = { ...FONT_BOLD, size: 14 };
  title.alignment = { horizontal: "center" };
  worksheet.getRow(2).height = 28;

  // Address block
  worksheet.mergeCells("A3:C3");
  worksheet.mergeCells("D3:F3");
  worksheet.mergeCells("G3:I3");
  worksheet.getCell("A3").value = `Vendor: ${data.cardCode} - ${data.cardName}`;
  worksheet.getCell("D3").value = `Date: ${data.docDate}`;
  worksheet.getCell("G3").value = `Status: ${data.docStatus}`;
  worksheet.getRow(3).font = FONT;
  worksheet.getRow(3).height = 20;

  if (data.address) {
    worksheet.mergeCells("A4:I4");
    worksheet.getCell("A4").value = `Address: ${data.address}`;
    worksheet.getRow(4).font = FONT;
  }

  // Blank row before table
  const headerRowNum = data.address ? 6 : 5;
  const headerRow = worksheet.getRow(headerRowNum);

  // Table headers
  const headers = ["#", "Item Code", "Description", "Qty", "UOM", "Price", "Total", "Whs", "Tax"];
  headers.forEach((header, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = header;
    cell.font = { ...FONT_BOLD, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center" };
    addBorder(cell);
  });
  headerRow.height = 22;

  // Data rows with zebra striping
  data.lines.forEach((line, i) => {
    const rowNum = headerRowNum + 1 + i;
    const row = worksheet.getRow(rowNum);
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
  const totalRow = worksheet.getRow(totalRowNum);
  worksheet.mergeCells(totalRowNum, 1, totalRowNum, 6);
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
    worksheet.mergeCells(currentRow, 1, currentRow, 9);
    worksheet.getCell(currentRow, 1).value = `Comments: ${data.comments}`;
    worksheet.getRow(currentRow).font = { ...FONT, italic: true };
    currentRow++;
  }

  // Attachments section
  if (data.attachments.length > 0) {
    currentRow++;
    worksheet.mergeCells(currentRow, 1, currentRow, 9);
    worksheet.getCell(currentRow, 1).value = "Attachments:";
    worksheet.getCell(currentRow, 1).font = FONT_BOLD;
    currentRow++;

    data.attachments.forEach((attachment) => {
      worksheet.mergeCells(currentRow, 1, currentRow, 9);
      worksheet.getCell(currentRow, 1).value =
        `  ${attachment.fileName}.${attachment.fileExtension}${attachment.freeText ? ` — ${attachment.freeText}` : ""}`;
      worksheet.getRow(currentRow).font = FONT;
      currentRow++;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
