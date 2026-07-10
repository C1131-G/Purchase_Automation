const h = require('@sap/hana-client');
const c = h.createClient({host:'172.18.30.114',port:30015,uid:'SYSTEM',pwd:'RcmVedha@2023'});
c.connect(e => {
  c.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME='IGN1' AND COLUMN_NAME LIKE 'U_%'", (e,r) => {
    console.log("IGN1 UDFs:", r);
    c.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME='OIGN' AND COLUMN_NAME LIKE 'U_%'", (e,r2) => {
      console.log("OIGN UDFs:", r2);
      c.exec("SELECT TABLE_NAME FROM SYS.TABLES WHERE TABLE_NAME LIKE '%Reason%'", (e,r3) => {
        console.log("Tables with Reason:", r3);
        c.disconnect();
      });
    });
  });
});
