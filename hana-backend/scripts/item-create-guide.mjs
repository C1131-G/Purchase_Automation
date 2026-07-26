import hana from "@sap/hana-client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const item = process.argv[2] || "7000000000000";
const buyer = "AJAX_POS_DB";
const seller = "RCM_TESTING_POS1";
const conn = hana.createConnection();

const connect = () =>
  new Promise((res, rej) =>
    conn.connect(
      {
        serverNode: `${env.HANA_HOST}:${env.HANA_PORT}`,
        uid: env.HANA_USER,
        pwd: env.HANA_PASSWORD,
        encrypt: true,
        sslValidateCertificate: false,
      },
      (err) => (err ? rej(err) : res()),
    ),
  );

const exec = (sql, params = []) =>
  new Promise((res, rej) => conn.exec(sql, params, (err, rows) => (err ? rej(err) : res(rows))));

await connect();

console.log("=== Buyer OITM ===");
try {
  console.log(
    JSON.stringify(
      await exec(
        `SELECT "ItemCode","ItemName","ItmsGrpCod","validFor","PrchseItem","SellItem","InvntItem",
                "BuyUnitMsr","SalUnitMsr","InvntryUom","DfltWH","UgpEntry","NumInBuy","NumInSale"
         FROM "${buyer}"."OITM" WHERE "ItemCode"=?`,
        [item],
      ),
      null,
      2,
    ),
  );
} catch (e) {
  console.log("buyer OITM err", e.message);
}

console.log("=== Seller OITM (expect empty) ===");
try {
  console.log(
    JSON.stringify(
      await exec(`SELECT "ItemCode" FROM "${seller}"."OITM" WHERE "ItemCode"=?`, [item]),
      null,
      2,
    ),
  );
} catch (e) {
  console.log(e.message);
}

console.log("=== Seller item groups (OITB) ===");
try {
  console.log(
    JSON.stringify(
      await exec(
        `SELECT TOP 20 "ItmsGrpCod","ItmsGrpNam" FROM "${seller}"."OITB" ORDER BY "ItmsGrpCod"`,
      ),
      null,
      2,
    ),
  );
} catch (e) {
  console.log(e.message);
}

console.log("=== Seller warehouses ===");
try {
  console.log(
    JSON.stringify(
      await exec(`SELECT "WhsCode","WhsName" FROM "${seller}"."OWHS" ORDER BY "WhsCode"`),
      null,
      2,
    ),
  );
} catch (e) {
  console.log(e.message);
}

console.log("=== Seller tax codes OVTG (sample) ===");
try {
  console.log(
    JSON.stringify(
      await exec(
        `SELECT "Code","Name","Category","Rate" FROM "${seller}"."OVTG"
         WHERE "Code" LIKE '%12%' OR "Code" LIKE 'IN%' OR "Code" LIKE 'OUT%'
         ORDER BY "Code"`,
      ),
      null,
      2,
    ),
  );
} catch (e) {
  console.log(e.message);
}

console.log("=== Seller UoM ===");
try {
  console.log(
    JSON.stringify(
      await exec(
        `SELECT TOP 15 "UomEntry","UomCode","UomName" FROM "${seller}"."OUOM" ORDER BY "UomEntry"`,
      ),
      null,
      2,
    ),
  );
} catch (e) {
  console.log(e.message);
}

console.log("=== Buyer UoM for entry 1 ===");
try {
  console.log(
    JSON.stringify(
      await exec(`SELECT "UomEntry","UomCode","UomName" FROM "${buyer}"."OUOM" WHERE "UomEntry"=1`),
      null,
      2,
    ),
  );
} catch (e) {
  console.log(e.message);
}

conn.disconnect();
