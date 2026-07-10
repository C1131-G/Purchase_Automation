import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { ExportDocumentData } from "./types";

type DocxAlignment = (typeof AlignmentType)[keyof typeof AlignmentType];

export async function generateWord(data: ExportDocumentData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  const borderLight = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "E2E8F0",
  };
  const borderNone = {
    style: BorderStyle.NONE,
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

  const doc = new Document({
    title: `${data.entityLabel} ${data.docNum}`,
    description: `Exported ${data.entityLabel} document`,
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
}
