const { dbCreds } = require("../config/hana-db");

/**
 * Update 'Reserved Customer' for a given Batch or Serial num.
 * OBTN - Batch Items
 * OSRN - Serial No. Items
 */
const updateReservedCustForBatch = `UPDATE ${dbCreds.CompanyDB}.OBTN SET "U_ReservedFor" = ?
    WHERE "DistNumber" = ?`;

const updateReservedCustForSerial = `UPDATE ${dbCreds.CompanyDB}.OSRN SET "U_ReservedFor" = ?
    WHERE "DistNumber" = ?`;

module.exports = { updateReservedCustForBatch, updateReservedCustForSerial };

//TODO: In the controller/helper funct. if the req.query contsins Batch#, use the 1st query,
//or if it is InternalSerial# use the 2nd one
