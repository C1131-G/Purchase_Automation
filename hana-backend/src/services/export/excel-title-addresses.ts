import type ExcelJS from "exceljs";
import type { ExportDocumentData } from "./export.types";

export function writeExcelTitleAndAddresses(
  ws: ExcelJS.Worksheet,
  data: ExportDocumentData,
  fontName: string,
  _borderLightColor: string,
): void {
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
}
