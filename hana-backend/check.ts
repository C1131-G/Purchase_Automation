import "dotenv/config";
import { executeTenantQuery } from "./src/dal/tenant-dal.helper";

async function run() {
  const db = process.env.COMMON_DB || "AJAX_POS_DB";
  const rows = await executeTenantQuery(
    db,
    'SELECT TOP 5 "DocNum", "DocTotal", "PaidSum", "PaidToDate" FROM "OINV" ORDER BY "DocEntry" DESC',
  );
  console.log(rows);
  process.exit(0);
}
run();
