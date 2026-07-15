import { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import type { ExportDocumentData } from "./export.types";

type DocxAlignment = (typeof AlignmentType)[keyof typeof AlignmentType];

export function appendWordLinesTable(
  data: ExportDocumentData,
  children: (Paragraph | Table)[],
  borderLight: any,
  borderNone: any,
): void {
  // 4. Lines Table
  const tableHeader = (
    text: string,
    widthPercent: number,
    align: DocxAlignment = AlignmentType.CENTER,
  ) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true, size: 16, color: "FFFFFF" })],
          alignment: align,
          spacing: { before: 120, after: 120 },
        }),
      ],
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      borders: {
        top: borderNone,
        bottom: borderNone,
        left: borderNone,
        right: borderNone,
      },
      shading: { fill: "0F172A" },
    });

  const tableCell = (
    paragraphs: Paragraph[],
    widthPercent: number,
    align: DocxAlignment = AlignmentType.LEFT,
    isAlt = false,
  ) =>
    new TableCell({
      children: paragraphs,
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      borders: {
        top: borderLight,
        bottom: borderLight,
        left: borderNone,
        right: borderNone,
      },
      shading: isAlt ? { fill: "F8FAFC" } : undefined,
    });

  const headerRow = new TableRow({
    children: [
      tableHeader("#", 5, AlignmentType.CENTER),
      tableHeader("Item Details", 40, AlignmentType.LEFT),
      tableHeader("UoM", 8, AlignmentType.CENTER),
      tableHeader("Qty", 8, AlignmentType.RIGHT),
      tableHeader("Unit Price", 12, AlignmentType.RIGHT),
      tableHeader("Disc %", 8, AlignmentType.CENTER),
      tableHeader("Tax %", 8, AlignmentType.CENTER),
      tableHeader("Line Total", 11, AlignmentType.RIGHT),
    ],
    tableHeader: true,
  });

  const dataRows = data.lines.map((line, idx) => {
    const isAlt = idx % 2 !== 0;

    const itemDetailsCellParagraphs = [
      new Paragraph({
        children: [new TextRun({ text: line.itemCode, bold: true, size: 16, color: "1E293B" })],
        spacing: { before: 80, after: line.itemDescription ? 40 : 80 },
      }),
    ];
    if (line.itemDescription) {
      itemDetailsCellParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.itemDescription, size: 14, color: "64748B" })],
          spacing: { after: 80 },
        }),
      );
    }

    return new TableRow({
      children: [
        // #
        tableCell(
          [
            new Paragraph({
              children: [
                new TextRun({ text: String(line.lineNum + 1), size: 16, color: "64748B" }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
            }),
          ],
          5,
          AlignmentType.CENTER,
          isAlt,
        ),
        // Item Details
        tableCell(itemDetailsCellParagraphs, 40, AlignmentType.LEFT, isAlt),
        // UoM
        tableCell(
          [
            new Paragraph({
              children: [new TextRun({ text: line.uomCode || "-", size: 16 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
            }),
          ],
          8,
          AlignmentType.CENTER,
          isAlt,
        ),
        // Qty
        tableCell(
          [
            new Paragraph({
              children: [new TextRun({ text: String(line.quantity), size: 16 })],
              alignment: AlignmentType.RIGHT,
              spacing: { before: 80, after: 80 },
            }),
          ],
          8,
          AlignmentType.RIGHT,
          isAlt,
        ),
        // Unit Price
        tableCell(
          [
            new Paragraph({
              children: [new TextRun({ text: line.unitPrice.toFixed(2), size: 16 })],
              alignment: AlignmentType.RIGHT,
              spacing: { before: 80, after: 80 },
            }),
          ],
          12,
          AlignmentType.RIGHT,
          isAlt,
        ),
        // Disc %
        tableCell(
          [
            new Paragraph({
              children: [new TextRun({ text: `${line.discountPercent}%`, size: 16 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
            }),
          ],
          8,
          AlignmentType.CENTER,
          isAlt,
        ),
        // Tax %
        tableCell(
          [
            new Paragraph({
              children: [new TextRun({ text: `${line.taxRate}%`, size: 16 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
            }),
          ],
          8,
          AlignmentType.CENTER,
          isAlt,
        ),
        // Line Total
        tableCell(
          [
            new Paragraph({
              children: [
                new TextRun({
                  text: line.lineTotal.toFixed(2),
                  bold: true,
                  size: 16,
                  color: "1E293B",
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { before: 80, after: 80 },
            }),
          ],
          11,
          AlignmentType.RIGHT,
          isAlt,
        ),
      ],
    });
  });

  const linesTable = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  children.push(linesTable);
  children.push(new Paragraph({ spacing: { after: 400 } }));
}
