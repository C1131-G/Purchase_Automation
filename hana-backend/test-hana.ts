import { executeTenantQuery } from "./src/dal/tenant-dal.helper";
import { config } from "dotenv";
config();

async function test() {
  try {
    const dbName = "C1131-G"; // The user's database from screenshot earlier
    const rows = await executeTenantQuery(dbName, 'SELECT "ListNum", "ListName" FROM OPLN ORDER BY "ListNum" ASC');
    console.log("Success! Rows:", rows);
  } catch (err) {
    console.error("Query Error:", err);
  }
}
test();
