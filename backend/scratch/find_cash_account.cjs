const { Client } = require("hdb");
const client = new Client({
  host: "172.18.30.114",
  port: 30015,
  user: "SYSTEM",
  password: "RcmVedha@2023",
});

client.connect((err) => {
  if (err) {
    console.error(err);
    return;
  }
  const query = `SELECT "AcctCode", "AcctName" FROM "SBODEMOIN"."OACT" WHERE "AcctName" LIKE '%Cash%'`;
  client.exec(query, (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
    client.end();
  });
});
