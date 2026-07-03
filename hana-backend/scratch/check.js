const { connectDatabase } = require("./dist/db/hana.config.js");
const { executeTenantQuery } = require("./dist/dal/tenant-dal.helper.js");

async function run() {
  await connectDatabase();
  const res = await executeTenantQuery(
    "VENDOR_PORTAL_DB",
    'SELECT "ItemCode", "LastPurPrc", "LstEvlPric", "AvgPrice" FROM OITM WHERE "ItemCode" = \'7000000000062\'',
  );
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
run().catch(console.error);
