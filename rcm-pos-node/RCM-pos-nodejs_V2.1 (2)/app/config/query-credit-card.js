const { dbCreds } = require("./hana-db");

/**
 * Get Credit Card list
 *
 * OCRC - Credit Cards table
 *
 */
exports.creditCards = `SELECT T0."CreditCard", T0."CardName", T0."AcctCode", T0."CompanyId" "SurchargeAccount",
    T0."Phone" "SurchargePercentage"
  FROM ${dbCreds.CompanyDB}.OCRC T0`;
