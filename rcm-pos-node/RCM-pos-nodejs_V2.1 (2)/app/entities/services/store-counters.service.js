const { dataSource } = require("../../services/database");

const entity = require("../store-counters");
const primaryKey = "storeCounterId";
const sortField = "counterName";
exports.parentPrimaryKey = "storeId";

/**
 * Creates a new StoreCounter rec. & returns it
 * @param {Object Array} data  New data
 * @param {Number} parentId Parent rec's ID
 */
exports.createStoreCounter = async (data, parentId, createdBy, createdAt) => {
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
exports.getStoreCounter = async (filter, noOfRecs = null) => {
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
 * @param {Number}  id PK
 * @param {Object}  newData New data to be updated into the db
 */
exports.updateStoreCounter = async (newData, modifiedBy, modifiedAt) => {
  try {
    /*
    NOTE: with `update()`, only one rec. can be updated at a time, so replaced it with `save()`
    const repository = dataSource.getRepository(entity);
    if(newData[primaryKey]) {
      delete newData[primaryKey];
    }
    return await repository.update({ [primaryKey]: id }, newData);
    */

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
 * Delete a StoreCounter with the given Id
 * @param {Number}  id  PK
 */
exports.deleteStoreCounter = async (filter) => {
  // if(filter.id) {
  //   filter[primaryKey] = filter.id;
  //   delete filter.id;
  // }

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
