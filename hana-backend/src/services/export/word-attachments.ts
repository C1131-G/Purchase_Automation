import { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import type { ExportDocumentData } from "./export.types";

type DocxAlignment = (typeof AlignmentType)[keyof typeof AlignmentType];

export function appendWordAttachments(
  data: ExportDocumentData,
  children: (Paragraph | Table)[],
  borderLight: any,
  borderNone: any,
): void {
  // 6. Attachments Section (If present)
  if (data.attachments && data.attachments.length > 0) {
    children.push(new Paragraph({ spacing: { before: 400, after: 120 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "ATTACHMENTS", bold: true, size: 16, color: "64748B" })],
        spacing: { after: 120 },
      }),
    );

    const attHeaderCell = (
      text: string,
      widthPercent: number,
      align: DocxAlignment = AlignmentType.LEFT,
    ) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: true, size: 16, color: "FFFFFF" })],
            alignment: align,
            spacing: { before: 100, after: 100 },
          }),
        ],
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        borders: {
          top: borderNone,
          bottom: borderNone,
          left: borderNone,
          right: borderNone,
        },
        shading: { fill: "475569" },
      });

    const attDataCell = (
      text: string,
      widthPercent: number,
      align: DocxAlignment = AlignmentType.LEFT,
      isAlt = false,
    ) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, size: 16, color: "334155" })],
            alignment: align,
            spacing: { before: 80, after: 80 },
          }),
        ],
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        borders: {
          top: borderLight,
          bottom: borderLight,
          left: borderNone,
          right: borderNone,
        },
        shading: isAlt ? { fill: "F8FAFC" } : undefined,
      });

    const attHeaderRow = new TableRow({
      children: [
        attHeaderCell("File Name", 40, AlignmentType.LEFT),
        attHeaderCell("Remarks / Note", 45, AlignmentType.LEFT),
        attHeaderCell("Uploaded Date", 15, AlignmentType.CENTER),
      ],
      tableHeader: true,
    });

    const attDataRows = data.attachments.map((att, idx) => {
      const isAlt = idx % 2 !== 0;
      const displayName =
        att.fileName.substring(att.fileName.lastIndexOf("_") + 1) +
        (att.fileExtension ? `.${att.fileExtension}` : "");
      const remarksText = att.freeText || "-";
      const rawDate = att.attachmentDate || "-";
      const dateText = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;

      return new TableRow({
        children: [
          attDataCell(displayName, 40, AlignmentType.LEFT, isAlt),
          attDataCell(remarksText, 45, AlignmentType.LEFT, isAlt),
          attDataCell(dateText, 15, AlignmentType.CENTER, isAlt),
        ],
      });
    });

    const attTable = new Table({
      rows: [attHeaderRow, ...attDataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    children.push(attTable);
  }
}
