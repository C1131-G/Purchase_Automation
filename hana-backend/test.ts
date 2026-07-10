import { DataSource } from "typeorm";

const dataSource = new DataSource({
  type: "sap",
  host: "172.18.30.114",
  port: 30015,
  username: "SYSTEM",
  password: "RcmVedha@2023",
  extra: { sslValidateCertificate: false },
});

async function run() {
  await dataSource.initialize();
  const res1 = await dataSource.query(
    `SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME = 'OIGN' AND COLUMN_NAME LIKE '%Reas%'`,
  );
  console.log("OIGN:", res1);
  const res2 = await dataSource.query(
    `SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME = 'IGN1' AND COLUMN_NAME LIKE '%Reas%'`,
  );
  console.log("IGN1:", res2);
  const res3 = await dataSource.query(
    `SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME = 'OIGN' AND COLUMN_NAME LIKE '%Adj%'`,
  );
  console.log("OIGN Adj:", res3);
  await dataSource.destroy();
}
run().catch(console.error);
