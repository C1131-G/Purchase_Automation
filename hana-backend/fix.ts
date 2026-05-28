import "dotenv/config";
import { executeTenantQuery } from "./src/dal/tenant-dal.helper";

async function run() {
  const db = process.env.COMMON_DB || "AJAX";
  await executeTenantQuery(
    db,
    'UPDATE "OINV" SET "PaidSum" = 20.00 WHERE "DocNum" = 1038869 AND "PaidSum" = 40.00',
  );
  await executeTenantQuery(
    db,
    'UPDATE "OINV" SET "PaidSum" = 210.00 WHERE "DocNum" = 1038870 AND "PaidSum" = 420.00',
  );
  await executeTenantQuery(
    db,
    'UPDATE "OINV" SET "PaidSum" = 3.82 WHERE "DocNum" = 1038875 AND "PaidSum" = 7.64',
  );
  console.log("Fixed");
  process.exit(0);
}
run();
