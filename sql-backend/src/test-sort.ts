import "dotenv/config";
import { initializeDatabase } from "./db/client";
import { getList as getPOList } from "./services/purchase-order.service";
import { getList as getAPList } from "./services/ap-invoice.service";

async function run() {
  console.log("Initializing database connection...");
  await initializeDatabase();
  console.log("Database initialized.");

  console.log("\n--- Testing PO Sorting by DocDate ASC ---");
  const poAsc = await getPOList({ sortBy: "DocDate", sortOrder: "asc", limit: 5 });
  console.log("PO ASC Results:");
  poAsc.data.forEach((r: any) => console.log(`DocNum: ${r.docNum}, DocDate: ${r.docDate}`));

  console.log("\n--- Testing PO Sorting by DocDate DESC ---");
  const poDesc = await getPOList({ sortBy: "DocDate", sortOrder: "desc", limit: 5 });
  console.log("PO DESC Results:");
  poDesc.data.forEach((r: any) => console.log(`DocNum: ${r.docNum}, DocDate: ${r.docDate}`));

  console.log("\n--- Testing AP Invoice Sorting by DocDate ASC ---");
  const apAsc = await getAPList({ sortBy: "DocDate", sortOrder: "asc", limit: 5 });
  console.log("AP ASC Results:");
  apAsc.data.forEach((r: any) => console.log(`DocNum: ${r.docNum}, DocDate: ${r.docDate}`));

  console.log("\n--- Testing AP Invoice Sorting by DocDate DESC ---");
  const apDesc = await getAPList({ sortBy: "DocDate", sortOrder: "desc", limit: 5 });
  console.log("AP DESC Results:");
  apDesc.data.forEach((r: any) => console.log(`DocNum: ${r.docNum}, DocDate: ${r.docDate}`));

  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
