import ExcelJS from "exceljs";
import type { ExportDocumentData } from "./export.types";
import { writeExcelTitleAndAddresses } from "./excel-title-addresses";
import { writeExcelLinesTable } from "./excel-lines-table";
import { writeExcelTotalsAndAttachments } from "./excel-totals-attachments";

export async function generateExcel(data: ExportDocumentData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vendor Portal";
  wb.created = new Date();

  const ws = wb.addWorksheet(data.entityLabel);
  ws.views = [{ showGridLines: true }];

  const columnsDef = [
    { key: "lineNum", width: 6 },
    { key: "itemCode", width: 18 },
    { key: "itemDescription", width: 35 },
    { key: "uomCode", width: 8 },
    { key: "quantity", width: 12 },
    { key: "unitPrice", width: 14 },
    { key: "discountPercent", width: 12 },
    { key: "taxRate", width: 10 },
    { key: "taxCode", width: 10 },
    { key: "lineTotal", width: 16 },
    { key: "warehouseCode", width: 14 },
  ];
  columnsDef.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width;
  });

  const fontName = "Segoe UI";
  const borderLightColor = "FFE2E8F0";

  writeExcelTitleAndAddresses(ws, data, fontName, borderLightColor);
  const currentRow = writeExcelLinesTable(ws, data, fontName, borderLightColor);
  writeExcelTotalsAndAttachments(ws, data, fontName, borderLightColor, currentRow);

  const buffer = await wb.xlsx.writeBuffer();
  return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
}
