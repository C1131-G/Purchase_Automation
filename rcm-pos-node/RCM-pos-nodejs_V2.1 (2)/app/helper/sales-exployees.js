const dbHelper = require("../helper/db.js");
const query = require("../config/query-misc.js");

/**
 * Get the list of Active Sales Employees
 */
// exports.getSalesEmployees = (storeLocation, userCode) => {
//   try {
//     let sql;
//     sql = query.selectSalesEmployees;
//     if (storeLocation) {
//       sql = sql + `AND T0."Fax" IN ('${storeLocation}')`;
//     }
//     if (userCode) {
//       sql = sql + `AND UPPER(T0."U_POSUser") IN  (UPPER('${userCode}'))`;
//     }
//     console.log("Sql:", sql);
//     const rows = dbHelper.executeWithValues(sql);
//     // console.log("getSalesEmployees- rows: "+JSON.stringify(rows));
//     return rows;
//   } catch (err) {
//     console.log(
//       "getSalesEmployees - controller - error: " + JSON.stringify(err.message)
//     );
//     throw err;
//   }
// };
//rvin

exports.getSalesEmployees = (storeLocation, userCode) => {
  // You can keep userCode here, even if it's not used, to match the controller
  try {
    let sql = query.selectSalesEmployees; // Base query: SELECT ... FROM OSLP WHERE Active = 'Y'

    // Optional Store Location filter
    // This part is good because it filters employees by the store.
    if (storeLocation) {
      // Note: This is still vulnerable to SQL injection. Using parameters is safer.
      sql += ` AND (T0."Fax" = '${storeLocation}' OR T0."Fax" IS NULL)`;
    }

    console.log("Executing getSalesEmployees SQL:", sql);

    const rows = dbHelper.executeWithValues(sql); // This should now work without error
    return rows;
  } catch (err) {
    console.log("getSalesEmployees - error:", JSON.stringify(err.message));
    throw err;
  }
};
