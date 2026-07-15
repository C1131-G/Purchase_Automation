import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { ExportDocumentData } from "./export.types";

export function appendWordCommentsAndTotals(
  data: ExportDocumentData,
  children: (Paragraph | Table)[],
  borderLight: any,
  borderNone: any,
): void {
  // 5. Comments & Summary Totals (Side-by-Side below the table)
  const bottomCells: TableCell[] = [];

  // Left Cell: Comments (shaded, left border)
  const leftCellChildren: Paragraph[] = [];
  if (data.comments) {
    leftCellChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "COMMENTS & REMARKS", bold: true, size: 16, color: "64748B" }),
        ],
        spacing: { before: 120, after: 120 },
      }),
    );
    leftCellChildren.push(
      new Paragraph({
        children: [new TextRun({ text: data.comments, size: 18, color: "475569" })],
        spacing: { after: 120 },
      }),
    );
  }

  bottomCells.push(
    new TableCell({
      children:
        leftCellChildren.length > 0
          ? leftCellChildren
          : [new Paragraph({ spacing: { after: 100 } })],
      width: { size: 55, type: WidthType.PERCENTAGE },
      borders: data.comments
        ? {
            left: { style: BorderStyle.SINGLE, size: 24, color: "3B82F6" }, // Thick blue left border
            top: borderLight,
            bottom: borderLight,
            right: borderLight,
          }
        : {
            left: borderNone,
            top: borderNone,
            bottom: borderNone,
            right: borderNone,
          },
      shading: data.comments ? { fill: "F8FAFC" } : undefined,
    }),
  );

  // Right Cell: Summary Totals
  const rightCellChildren: Paragraph[] = [];
  rightCellChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "SUMMARY TOTALS", bold: true, size: 16, color: "64748B" })],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 120, after: 120 },
    }),
  );

  let subtotal = 0;
  for (const line of data.lines) {
    subtotal += line.lineTotal;
  }

  rightCellChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Subtotal: ", size: 18, color: "64748B" }),
        new TextRun({
          text: `${data.docCurr || ""} ${subtotal.toFixed(2)}`,
          bold: true,
          size: 18,
          color: "0F172A",
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80 },
    }),
  );

  if (data.discountPercent > 0 || data.discountAmount > 0) {
    const discLabel =
      data.discountPercent > 0 ? `Discount (${data.discountPercent}%): ` : "Discount: ";
    const discVal =
      data.discountAmount > 0 ? data.discountAmount : (subtotal * data.discountPercent) / 100;
    rightCellChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: discLabel, size: 18, color: "64748B" }),
          new TextRun({
            text: `- ${data.docCurr || ""} ${discVal.toFixed(2)}`,
            bold: true,
            size: 18,
            color: "B91C1C",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 80 },
      }),
    );
  }

  // Divider line before Grand Total
  rightCellChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "────────────────────", size: 14, color: "CBD5E1" })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80 },
    }),
  );

  rightCellChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Grand Total: ", bold: true, size: 20, color: "0F172A" }),
        new TextRun({
          text: `${data.docCurr || ""} ${data.docTotal.toFixed(2)}`,
          bold: true,
          size: 24,
          color: "1E3A8A",
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 120 },
    }),
  );

  bottomCells.push(
    new TableCell({
      children: rightCellChildren,
      width: { size: 45, type: WidthType.PERCENTAGE },
      borders: {
        left: borderNone,
        top: borderNone,
        bottom: borderNone,
        right: borderNone,
      },
    }),
  );

  const bottomTable = new Table({
    rows: [
      new TableRow({
        children: bottomCells,
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(bottomTable);
}
