const { dataSource } = require("../../services/database");
const entity = require("../parked-transactions.js");
const primaryKey = "parkedTransactionId";
const sortField = "parkedDateTime";
const defaultSortOrder = "ASC";
const { getStoreWarehouse } = require("./store-warehouses.service");

/**
 * Creates a new ParkedTransaction  rec. & returns it
 */
exports.createParkedTransaction = async (data) => {
  try {
    const repository = dataSource.getRepository(entity);
    const newRec = await repository.save(data);
    return newRec;
  } catch (err) {
    throw err;
  }
};

/**
 *
 * @param {*} filter
 * @param {Number} noOfRecs No. recs to be returned
 */
exports.getParkedTransaction = async (filter, storeId, noOfRecs = null) => {
  console.log("filter: ", JSON.stringify(filter));
  if (filter.id) {
    filter[primaryKey] = filter.id;
    delete filter.id;
  }

  try {
    const repository = dataSource.getRepository(entity);
    let records;

    if (noOfRecs === 1) {
      // result = await repository.findOne({ where: { [primaryKey]: id } }); //opt #1
      //return await repository.findOneBy(filter); //{ [primaryKey]: id } //orderBy
      records = await repository.findOneBy(filter); //{ [primaryKey]: id } //orderBy
    } else {
      // return await repository.find({ //'order' doesn't work with findBy()
      //   where: filter,
      //   order: {
      //     [sortField]: defaultSortOrder,
      //   }
      // });
      records = await repository.find({
        //'order' doesn't work with findBy()
        where: filter,
        order: {
          [sortField]: defaultSortOrder,
        },
      });
    }
    //
    if (!records) {
      return [];
    }
    const filteredRecords = [];
    for (const record of records) {
      const { data } = record;

      // Parse the `data` field into an object
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        console.error(`Error parsing data for record with storeId ${storeId}:`, error);
        continue;
      }
      console.log("ParsedData", parsedData);
      let warehouseList = [];
      try {
        // Get the warehouse list for the storeId
        let warehouseResponse = await getStoreWarehouse({ storeId: storeId });
        warehouseList = warehouseResponse.map((warehouse) => warehouse.warehouseCode);
      } catch (error) {
        console.error(`Error fetching warehouse list for storeId ${storeId}:`, error);
        continue; // Skip the record if the warehouse list couldn't be retrieved
      }
      console.log("WarehouseList", warehouseList);
      // Check if all `WhsCode` values in `salesItems` match the warehouse list
      // const allWhsCodesValid = parsedData.salesItems.every(item =>
      //   warehouseList.includes(item.WhsCode)
      // );
      const allWhsCodesValid = parsedData.salesItems.every((item) => {
        const isValid = warehouseList.includes(item.WhsCode);
        if (!isValid) {
          console.error(`Invalid WhsCode: ${item.WhsCode}, WarehouseList: ${warehouseList}`);
        }
        return isValid;
      });
      console.log("allWhsCodesValid", allWhsCodesValid);
      // Include the record only if all WhsCodes are valid
      if (allWhsCodesValid) {
        filteredRecords.push(record);
      }
    }
    return filteredRecords;
  } catch (err) {
    throw err;
  }
};

/**
 * Get the latest `nextRefNum` from the `ParkedTransactions` table
 * @returns {Number} The `nextRefNum` to be used for the new transaction
 */
exports.getLatestNextRefNum = async () => {
  try {
    const repository = dataSource.getRepository(entity);

    // Find the latest record
    const latestRecords = await repository.find({
      order: {
        nextRefNum: "DESC",
      },
      take: 1,
    });

    // If no records are found, start with 1
    if (latestRecords.length === 0) {
      return 1;
    }

    return latestRecords[0].nextRefNum;
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a ParkedTransaction with the given Id
 * @param {Number}  id  PK
 */
exports.deleteParkedTransaction = async (id) => {
  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete({ [primaryKey]: id });
  } catch (err) {
    throw err;
  }
};
