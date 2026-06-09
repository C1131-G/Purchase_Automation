const dbHelper = require("../helper/db.js");
const { dbCreds } = require("../config/hana-db.js");

/**
 * Gets the list of Warehouses
 */
exports.getWarehouses = (req) => {
  try {
    // dbHelper.executeQuery(query.warhouseQuery, (err, rows) => {
    //   if(err)
    //     throw err;
    //   console.log("getWarehouseList %s", JSON.stringify(rows));
    //   res.send(rows);
    // })
    let values = [];
    let select = `SELECT T0."WhsCode", T0."WhsName", T1."BinCode", T0."Location" "LocationCode",
        T2."Location" "LocationName", T0."U_GITWH" "GitWHCode"
      FROM ${dbCreds.CompanyDB}.OWHS T0
        LEFT OUTER JOIN ${dbCreds.CompanyDB}.OBIN T1 ON T0."DftBinAbs" = T1."AbsEntry"
        INNER JOIN ${dbCreds.CompanyDB}.OLCT T2 ON T0."Location" = T2."Code"`;

    let where = ` WHERE T0."Inactive" ='N'`;
    //AND T0."U_portal"='Yes'

    if (req.branchId) {
      select = select + ` INNER JOIN ${dbCreds.CompanyDB}.OBPL T3 ON T0."BPLid" = T3."BPLId"`;
      where = where + ` AND T0."BPLid" = ?`;
      values.push(req.branchId); //parseInt(req.branchId, 10);
    }
    if (req.locationCode) {
      where = where + ` AND T0."Location" = ?`;
      values.push(req.locationCode);
    }
    let orderBy = ` ORDER BY T0."WhsCode"`;
    const rows = dbHelper.executeWithValues(select + where + orderBy, values);
    // console.log("getWarehouses %s", JSON.stringify(rows));

    return rows;
  } catch (err) {
    console.log("getWarehouses - error: " + JSON.stringify(err));
    throw err;
  }
};
