const { dbCreds } = require("./hana-db");

const insertSalesBatchHeader = `INSERT INTO ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" ("DocEntry", "DocNum", "Period", "Series", 
    "Object", "UserSign", "Transfered", "Status", 
    "CreateDate", "CreateTime", "UpdateDate", "UpdateTime", "DataSource", 
    "RequestStatus", "Creator", "U_ItemCode", "U_LineNum", 
    "U_InvNo", "U_Quantity", "U_TotalQty", "U_WhsCode")
    VALUES (?, ?, ?, ?)`;

const insertSalesBatchRows = `INSERT INTO ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" ( "DocEntry", "LineId", "VisOrder", 
  "Object", "U_Batch", "U_Width", "U_Height", "U_Length", "U_AvlQty", "U_BalAvlQty", 
    "U_NoOfPcs", "U_SelQty", "U_AvlPcs", "U_BalPcs")
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

module.exports = {
  insertSalesBatchHeader,
  insertSalesBatchRows,
};
