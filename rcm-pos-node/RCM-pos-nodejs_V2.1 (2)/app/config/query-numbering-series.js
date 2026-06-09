const { dbCreds } = require("./hana-db");

exports.numberingSeries = `SELECT T0."Series", T0."SeriesName", T0."InitialNum"
    FROM ${dbCreds.CompanyDB}.NNM1 T0
  WHERE T0."ObjectCode" = ?
        AND LOWER(T0."Remark") = ?`;
