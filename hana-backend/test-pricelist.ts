import { executeTenantQuery } from "./src/dal/tenant-dal.helper";
import { getPriceLists } from "./src/services/master-data.service";
import { config } from "dotenv";
config();

async function test() {
  try {
    const dbName = "C1131-G"; // The user's database from screenshot earlier
    const res = await getPriceLists(dbName);
    console.log("Success! Price Lists:", res);
  } catch (err) {
    console.error("Query Error:", err);
  }
}
test();
