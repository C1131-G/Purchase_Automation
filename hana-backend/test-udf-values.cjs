const h = require('@sap/hana-client');
const c = h.createClient({host:'172.18.30.114',port:30015,uid:'SYSTEM',pwd:'RcmVedha@2023'});
c.connect(e => {
  c.exec("SELECT \"FldValue\", \"Descr\" FROM \"AJAX_POS_DB\".\"UFD1\" WHERE \"TableID\"='IGN1' AND \"FieldID\" IN (SELECT \"FieldID\" FROM \"AJAX_POS_DB\".\"CUFD\" WHERE \"TableID\"='IGN1' AND \"AliasID\"='INVADJMTRES')", (e,r) => {
    console.log("IGN1 Reasons:", r);
    c.exec("SELECT \"FldValue\", \"Descr\" FROM \"AJAX_POS_DB\".\"UFD1\" WHERE \"TableID\"='IGE1' AND \"FieldID\" IN (SELECT \"FieldID\" FROM \"AJAX_POS_DB\".\"CUFD\" WHERE \"TableID\"='IGE1' AND \"AliasID\"='INVADJMTRES')", (e,r2) => {
      console.log("IGE1 Reasons:", r2);
      c.disconnect();
    });
  });
});
