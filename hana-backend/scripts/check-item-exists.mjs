import hana from "@sap/hana-client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const item = process.argv[2] || "7000000000000";
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

let companies = [];
try {
  companies = await exec(`
    SELECT "COMPANY_ID", "COMPANY_CODE", "COMPANY_NAME", "SAP_DB_NAME", "IS_ACTIVE"
    FROM "SBOCOMMON"."IC_COMPANY"
    ORDER BY "COMPANY_ID"
  `);
  console.log("=== IC_COMPANY ===");
  console.log(JSON.stringify(companies, null, 2));
} catch (e) {
  console.log("=== IC_COMPANY ERROR ===", e.message);
}

let vst = [];
try {
  vst = await exec(`
    SELECT "DB_NAME" FROM "SBOCOMMON"."VST_COMMON"
    WHERE "DB_NAME" LIKE '%POS%' OR "DB_NAME" LIKE 'RCM%'
  `);
  console.log("=== VST_COMMON RCM/POS ===");
  console.log(JSON.stringify(vst, null, 2));
} catch (e) {
  console.log("=== VST_COMMON ERROR ===", e.message);
}

const dbs = [
  ...new Set([
    ...companies.map((c) => c.SAP_DB_NAME).filter(Boolean),
    ...vst.map((v) => v.DB_NAME).filter(Boolean),
    "RCM_TESTING_POS1",
    "RCM_TESTING_POS",
  ]),
];

console.log("\n=== Checking item", item, "in DBs:", dbs.join(", "), "===\n");

for (const db of dbs) {
  try {
    const rows = await exec(
      `SELECT "ItemCode", "ItemName", "validFor", "frozenFor",
              "PrchseItem", "SellItem", "InvntItem",
              "VatGroupPu", "VatGroupSa", "BuyUnitMsr", "SalUnitMsr", "DfltWH"
       FROM "${db}"."OITM"
       WHERE "ItemCode" = ?`,
      [item],
    );
    if (rows.length === 0) {
      console.log(`[MISSING] ${db}: item ${item} NOT found in OITM`);
    } else {
      console.log(`[FOUND]   ${db}:`, JSON.stringify(rows[0], null, 2));
    }
  } catch (e) {
    console.log(`[ERROR]   ${db}: ${e.message}`);
  }
}

conn.disconnect();
