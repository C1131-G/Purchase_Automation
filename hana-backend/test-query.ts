import { getTenantRepository } from "./src/dal/tenant-dal.helper";
import { ARInvoiceSchema } from "./src/db/schemas/ar-invoice.schema";
import { AppDataSource } from "./src/db/data-source";

async function main() {
  try {
    await AppDataSource.initialize();
    console.log("DB initialized");

    const repo = await getTenantRepository("FGL_UAT", ARInvoiceSchema);

    // Test finding SO from AR Invoice
    const q1 = `
      SELECT TOP 1 "DocEntry", "DocNum" FROM "OINV" ORDER BY "DocEntry" DESC
    `;
    const invoices = await repo.manager.query(q1);
    console.log("Latest Invoices:", invoices);

    if (invoices.length > 0) {
      const invEntry = invoices[0].DocEntry;

      const q2 = `
        SELECT T0."BaseType", T0."BaseEntry", T1."DocNum" 
        FROM "INV1" T0
        LEFT JOIN "ORDR" T1 ON T0."BaseEntry" = T1."DocEntry"
        WHERE T0."DocEntry" = ${invEntry} AND T0."BaseType" = 17
      `;
      const baseLines = await repo.manager.query(q2);
      console.log("Base SO for Invoice:", baseLines);

      const q3 = `
        SELECT T0."DocEntry", T0."DocNum" 
        FROM "ORCT" T0 
        INNER JOIN "RCT2" T1 ON T0."DocEntry" = T1."DocNum" 
        WHERE T1."DocEntry" = ${invEntry} AND T1."InvType" = 13
      `;
      const payments = await repo.manager.query(q3);
      console.log("Payments for Invoice:", payments);

      const q4 = `
        SELECT T0."DocEntry", T0."DocNum" 
        FROM "ORIN" T0 
        INNER JOIN "RIN1" T1 ON T0."DocEntry" = T1."DocEntry" 
        WHERE T1."BaseEntry" = ${invEntry} AND T1."BaseType" = 13
      `;
      const credits = await repo.manager.query(q4);
      console.log("Credits for Invoice:", credits);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
