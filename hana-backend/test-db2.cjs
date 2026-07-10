const h = require('@sap/hana-client');
const c = h.createClient({host:'172.18.30.114',port:30015,uid:'SYSTEM',pwd:'RcmVedha@2023'});
c.connect(e => {
  c.exec("SELECT TOP 5 \"IssReason\" FROM \"AJAX_POS_DB\".\"OIGN\" WHERE \"IssReason\" IS NOT NULL AND \"IssReason\" != -1", (e,r) => {
    console.log(r);
    c.exec("SELECT TOP 5 \"Reason\", \"Descr\" FROM \"AJAX_POS_DB\".\"OIRR\"", (e,r) => {
      console.log("OIRR (Reasons):", r);
      c.disconnect();
    });
  });
});
