import { executeTenantQuery } from "./dal/tenant-dal.helper.ts";

async function run() {
  // Check if item 8400000000784 is batch/serial managed
  const itemRows = await executeTenantQuery(
    "AJAX_POS_DB",
    `SELECT "ManSerNum", "ManBtchNum", "ItemName" FROM OITM WHERE "ItemCode" = '8400000000784'`,
  );
  console.log("Item 8400000000784:", itemRows);

  // Check bins in a few warehouses
  const binRows = await executeTenantQuery(
    "AJAX_POS_DB",
    `SELECT "AbsEntry", "WhsCode", "BinCode" FROM OBIN WHERE "WhsCode" IN ('L101', 'W101', 'BA') LIMIT 10`,
  );
  console.log("Bins:", binRows);
}
run().catch(console.error);
