const { dataSource } = require("../../services/database");

const entity = require("../store-warehouses");
const primaryKey = "storeWarehouseId";
const sortField = "warehouseCode";
exports.parentPrimaryKey = "storeId";

/**
 * Creates a new StoreWarehouse rec. & returns it
 * @param {Object Array} data  New data
 * @param {Number} parentId Parent rec's ID
 */
exports.createStoreWarehouse = async (data, parentId, createdBy, createdAt) => {
  try {
    let dataWithFK;
    if (Array.isArray(data)) {
      dataWithFK = data.map((rec) => {
        return { ...rec, [this.parentPrimaryKey]: parentId, createdBy, createdAt }; //Add Parent rec's PK, createdBy, createdAt to each rec.
      });
    } else {
      dataWithFK = { ...data, [this.parentPrimaryKey]: parentId, createdBy, createdAt };
    }
    const repository = dataSource.getRepository(entity);
    return await repository.save(dataWithFK);
  } catch (err) {
    throw err;
  }
};

/**
 *
 * @param {Object} filter
 * @param {Number} noOfRecs No. recs to be returned
 */
exports.getStoreWarehouse = async (filter, noOfRecs = null) => {
  console.log("filter: ", JSON.stringify(filter));
  if (filter.id) {
    filter[primaryKey] = filter.id;
    delete filter.id;
  }

  try {
    const repository = dataSource.getRepository(entity);
    if (noOfRecs === 1) {
      // response = await repository.findOne({ where: { [primaryKey]: id } }); //opt #1
      return await repository.findOneBy(filter); //{ [primaryKey]: id }
    } else {
      return await repository.find({
        //'order' doesn't work with findBy()
        where: filter,
        order: {
          [sortField]: "ASC",
        },
      });
    }
  } catch (err) {
    throw err;
  }
};

/**
 * @param {Object}  newData New data to be updated into the db
 * @param {Number}  modifiedBy
 * @param {Date}    modifiedAt
 */
exports.updateStoreWarehouse = async (newData, modifiedBy, modifiedAt) => {
  try {
    let data;
    if (Array.isArray(newData)) {
      data = newData.map((rec) => {
        return { ...rec, modifiedBy, modifiedAt }; //Add modifiedBy, modifiedAt to each rec.
      });
    } else {
      data = { ...newData, modifiedBy, modifiedAt };
    }
    const repository = dataSource.getRepository(entity);
    return await repository.save(data);
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a StoreWarehouse with the given Id
 * @param {Number}  id  PK
 */
exports.deleteStoreWarehouse = async (filter) => {
  //Added to support mutliple recs. deletion at a time
  let ids;
  if (filter.id.includes(",")) {
    ids = filter.id.split(","); //.map(Number) //to convert array of String to array of Numbers (NOT Required here)
  } else {
    ids = filter.id;
  }

  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete(ids);
  } catch (err) {
    throw err;
  }
};
