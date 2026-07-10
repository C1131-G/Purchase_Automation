const h = require('@sap/hana-client');
const c = h.createClient({host:'172.18.30.114',port:30015,uid:'SYSTEM',pwd:'RcmVedha@2023'});
c.connect(e => {
  if(e) throw e;
  c.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME='OIGN' AND COLUMN_NAME LIKE '%Reason%'", (e,r) => {
    console.log("OIGN:",r);
    c.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME='IGN1' AND COLUMN_NAME LIKE '%Reason%'", (e,r) => {
      console.log("IGN1:",r);
      c.exec("SELECT COLUMN_NAME FROM SYS.COLUMNS WHERE TABLE_NAME='OIGE' AND COLUMN_NAME LIKE '%Reason%'", (e,r) => {
        console.log("OIGE:",r);
        c.disconnect();
      });
    });
  });
});
