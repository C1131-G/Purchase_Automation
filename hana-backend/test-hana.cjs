const hana = require('@sap/hana-client');
const conn = hana.createConnection();
conn.connect({serverNode: '172.18.30.114:30015', uid: 'SYSTEM', pwd: 'RcmVedha@2023'}, (err) => {
  if (err) throw err;
  conn.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME = 'OIGN' AND COLUMN_NAME LIKE '%Reas%'", (err, result) => {
    console.log("OIGN Reas:", result);
    conn.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME = 'IGN1' AND COLUMN_NAME LIKE '%Reas%'", (err, result) => {
      console.log("IGN1 Reas:", result);
      conn.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME = 'OIGN' AND COLUMN_NAME LIKE '%Adj%'", (err, result) => {
        console.log("OIGN Adj:", result);
        conn.disconnect();
      });
    });
  });
});
