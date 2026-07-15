import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { ExportDocumentData } from "./export.types";

import { appendWordLinesTable } from "./word-lines-table";
import { appendWordCommentsAndTotals } from "./word-comments-totals";
import { appendWordAttachments } from "./word-attachments";

export async function generateWord(data: ExportDocumentData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  const borderLight = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "E2E8F0",
  };
  const borderNone = {
    style: BorderStyle.NONE,
    size: 0,
    color: "FFFFFF",
  };

  // 1. Title Block
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "VENDOR PORTAL", bold: true, size: 16, color: "64748B" })],
      spacing: { before: 200, after: 40 },
    }),
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: data.entityLabel, bold: true, size: 40, color: "1E3A8A" })],
      spacing: { after: 300 },
    }),
  );

  // 2. Info Block (Document details)
  const infoLines = [
    `Document #: ${data.docNum}`,
    `Status: ${data.docStatus.toLowerCase().includes("open") ? "Open" : data.docStatus.toLowerCase().includes("close") ? "Closed" : data.docStatus}`,
    `Document Date: ${data.docDate}`,
    `Due Date: ${data.docDueDate}`,
  ];
  if (data.numAtCard) {
    infoLines.push(`Reference: ${data.numAtCard}`);
  }

  for (const line of infoLines) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 18, color: "334155" })],
        spacing: { after: 60 },
      }),
    );
  }

  children.push(new Paragraph({ spacing: { after: 300 } }));

  // 3. Address Blocks: Bill To vs Ship To (Side-by-side using borderless table)
  const billToLines: string[] = [];
  if (data.address) {
    billToLines.push(
      ...data.address
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    );
  }
  if (data.salesPersonCode) {
    billToLines.push(`Sales Person: ${data.salesPersonCode}`);
  }

  const shipToLines: string[] = [];
  if (data.address2) {
    shipToLines.push(
      ...data.address2
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    );
  }

  const addressTable = new Table({
    rows: [
      new TableRow({
        children: [
          // BILL TO
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "BILL TO ADDRESS", bold: true, size: 16, color: "64748B" }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${data.cardCode} - ${data.cardName}`,
                    bold: true,
                    size: 20,
                    color: "0F172A",
                  }),
                ],
                spacing: { after: 80 },
              }),
              ...billToLines.map(
                (line) =>
                  new Paragraph({
                    children: [new TextRun({ text: line, size: 18, color: "334155" })],
                    spacing: { after: 60 },
                  }),
              ),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: borderNone,
              bottom: borderNone,
              left: borderNone,
              right: borderNone,
            },
          }),
          // SHIP TO
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "SHIP TO ADDRESS", bold: true, size: 16, color: "64748B" }),
                ],
                spacing: { after: 120 },
              }),
              ...(data.address2
                ? shipToLines.map(
                    (line) =>
                      new Paragraph({
                        children: [new TextRun({ text: line, size: 18, color: "334155" })],
                        spacing: { after: 60 },
                      }),
                  )
                : [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Same as billing address",
                          italics: true,
                          size: 18,
                          color: "94A3B8",
                        }),
                      ],
                      spacing: { after: 60 },
                    }),
                  ]),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: borderNone,
              bottom: borderNone,
              left: borderNone,
              right: borderNone,
            },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(addressTable);
  children.push(new Paragraph({ spacing: { after: 400 } }));

  appendWordLinesTable(data, children, borderLight, borderNone);
  appendWordCommentsAndTotals(data, children, borderLight, borderNone);
  appendWordAttachments(data, children, borderLight, borderNone);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
