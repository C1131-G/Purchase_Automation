import("../dist/db/hana.config.js")
  .then(async ({ connectDatabase }) => {
    const { executeTenantQuery } = await import("../dist/dal/tenant-dal.helper.js");
    await connectDatabase();
    const res = await executeTenantQuery(
      "VENDOR_PORTAL_DB",
      'SELECT "ItemCode", "LastPurPrc", "LstEvlPric", "AvgPrice" FROM OITM WHERE "ItemCode" = \'7000000000062\'',
    );
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch(console.error);
