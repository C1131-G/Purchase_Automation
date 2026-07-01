// Word generator: Styled .docx with brand header, address, table, totals, and attachments.

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { ExportDocumentData } from "./types";

const ACCENT = "1F4E79";

export const generateWord = async (data: ExportDocumentData): Promise<Buffer> => {
  const children: (Paragraph | Table)[] = [];

  // Brand header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { fill: ACCENT, type: "clear" },
      spacing: { before: 120, after: 120 },
      children: [new TextRun({ bold: true, size: 28, color: "FFFFFF", text: "VENDOR PORTAL" })],
    }),
  );

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ bold: true, size: 24, text: `${data.title} #${data.docNum}` })],
    }),
  );

  // Address table (borderless, 2 columns)
  const noBorder = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };
  const addressRows = [
    new TableRow({
      children: [
        new TableCell({
          borders: noBorder,
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ bold: true, text: "Vendor:" })] })],
        }),
        new TableCell({
          borders: noBorder,
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: data.docDate })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          borders: noBorder,
          children: [
            new Paragraph({
              children: [new TextRun({ text: `${data.cardCode} - ${data.cardName}` })],
            }),
          ],
        }),
        new TableCell({
          borders: noBorder,
          children: [
            new Paragraph({ children: [new TextRun({ text: `Status: ${data.docStatus}` })] }),
          ],
        }),
      ],
    }),
  ];
  if (data.address) {
    addressRows.push(
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: data.address })] })],
          }),
          new TableCell({ borders: noBorder, children: [] }),
        ],
      }),
    );
  }
  children.push(
    new Table({ rows: addressRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  );

  // Table header
  const headerRow = new TableRow({
    tableHeader: true,
    children: ["#", "Item Code", "Description", "Qty", "UOM", "Price", "Total", "Whs"].map(
      (h) =>
        new TableCell({
          shading: { fill: ACCENT, type: "clear" },
          children: [
            new Paragraph({
              children: [new TextRun({ bold: true, color: "FFFFFF", size: 18, text: h })],
            }),
          ],
        }),
    ),
  });

  // Data rows
  const dataRows = data.lines.map(
    (line, i) =>
      new TableRow({
        children: [
          String(line.lineNum),
          line.itemCode,
          line.itemDescription,
          String(line.quantity),
          line.uom,
          String(line.price),
          String(line.total),
          line.warehouse,
        ].map(
          (v) =>
            new TableCell({
              shading: i % 2 === 1 ? { fill: "F2F7FB", type: "clear" } : undefined,
              children: [new Paragraph({ children: [new TextRun({ size: 18, text: v })] })],
            }),
        ),
      }),
  );

  children.push(
    new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
  );

  // Totals
  children.push(
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    new Paragraph({
      children: [
        new TextRun({ bold: true, size: 20, text: `Total (${data.docCurrency}): ` }),
        new TextRun({ bold: true, size: 20, text: String(data.docTotal) }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  );

  // Comments
  if (data.comments) {
    children.push(
      new Paragraph({
        spacing: { before: 100 },
        children: [new TextRun({ bold: true, size: 18, text: "Comments:" })],
      }),
      new Paragraph({
        indent: { left: 400 },
        children: [new TextRun({ size: 18, italics: true, color: "555555", text: data.comments })],
      }),
    );
  }

  // Attachments
  if (data.attachments.length > 0) {
    children.push(
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      new Paragraph({ children: [new TextRun({ bold: true, size: 18, text: "Attachments:" })] }),
      ...data.attachments.map(
        (a) =>
          new Paragraph({
            indent: { left: 400 },
            children: [
              new TextRun({
                size: 18,
                text: `• ${a.fileName}.${a.fileExtension}${a.freeText ? ` — ${a.freeText}` : ""}`,
              }),
            ],
          }),
      ),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
};
