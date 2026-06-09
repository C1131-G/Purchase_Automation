const { dbCreds } = require("./hana-db.js");

// T0."U_SG1", T0."U_SG2", T0."U_SG3",
exports.items = `SELECT T0."ItemCode", T0."ItemName", T0."FrgnName", T0."ItmsGrpCod", T0."ChapterID", T0."validFor",
    T0."ManBtchNum", T0."SellItem", T0."InvntItem",
    T0."PrchseItem", T0."OnHand", T0."IsCommited", T0."OnOrder", T0."SalUnitMsr", T0."BuyUnitMsr",
    T0."IUoMEntry", T0."PrdStdCst", T0."UserText", T0."InvntryUom",
    T0."U_SG1", T0."U_SG2", T0."U_SG3"
  FROM ${dbCreds.CompanyDB}.OITM T0
    WHERE 1 = 1`;

exports.itemGroups = `SELECT T0."ItmsGrpCod" "ItemGroupCode", T0."ItmsGrpNam" "ItemGroupName"
    FROM ${dbCreds.CompanyDB}.OITB T0`;

exports.itemSubGroups = `SELECT "FieldID", "FldValue" as "Value", "Descr" as "Description"
    FROM ${dbCreds.CompanyDB}."UFD1"
  WHERE "TableID"='OITM'
    AND "FieldID" = ?`;

// Get current Max Sequence#
exports.itemMaxSequenceNo = `SELECT MAX(T0."U_SEQ") as "MaxNo" FROM ${dbCreds.CompanyDB}.OITM T0`;
