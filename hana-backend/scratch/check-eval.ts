import { masterDataService } from "../src/services/master-data.service";
import { connectDatabase } from "../src/db/hana.config";

async function run() {
  await connectDatabase();
  // Using the DB name used in dev
  const data = await masterDataService.getProducts(
    "VENDOR_PORTAL_DB",
    undefined,
    "7000000000062",
    1,
    "sales",
    -2,
  );
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run().catch(console.error);
