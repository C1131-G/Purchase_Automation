import hana from "@sap/hana-client";

const connOptions = {
  host: "172.18.30.114",
  port: 30015,
  uid: "SYSTEM",
  pwd: "RcmVedha@2023",
};

const client = hana.createConnection();

client.connect(connOptions, (err) => {
  if (err) {
    console.error("Connection error:", err);
    return;
  }
  const query = `SELECT "AcctCode", "AcctName" FROM "B1_52434D5F4C495645_RW"."OACT" WHERE "AcctName" LIKE '%Cash%'`;
  client.exec(query, (err, rows) => {
    if (err) {
      console.error("Query error:", err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
    client.disconnect();
  });
});
