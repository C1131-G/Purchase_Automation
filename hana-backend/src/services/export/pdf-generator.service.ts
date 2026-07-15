import PDFDocument from "pdfkit";
import type { ExportDocumentData } from "./export.types";
import { writePdfDocumentHeader } from "./pdf-document-header";
import { writePdfLinesTable } from "./pdf-lines-table";
import { writePdfTotalsAttachmentsAndFooter } from "./pdf-totals-footer";

export async function generatePdf(data: ExportDocumentData): Promise<Buffer> {
  // bufferPages enables page counts in the footer without blank trailing pages
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 0, left: 40, right: 40 },
    bufferPages: true,
  });
  const buffers: Buffer[] = [];

  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width - 80;
  const { nextSectionY, rightAlignX, rightWidth } = writePdfDocumentHeader(doc, data, pageWidth);
  const lineY = writePdfLinesTable(doc, data, pageWidth, nextSectionY);
  writePdfTotalsAttachmentsAndFooter(doc, data, pageWidth, lineY, rightAlignX, rightWidth);

  doc.end();
  return pdfPromise;
}
