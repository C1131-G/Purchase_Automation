const { dataSource } = require("../../services/database");
const { createStoreWarehouse, updateStoreWarehouse } = require("./store-warehouses.service");

const entity = require("../stores");
const primaryKey = "storeId";
const sortField = "storeName";
const childRecPrimaryKey = "storeWarehouseId,";

/**
 * Creates a new Store  rec. & returns it
 */
exports.createStore = async (data) => {
  try {
    const repository = dataSource.getRepository(entity);
    const newRec = await repository.save(data);
    if (data.warehouses) {
      const newChildRec = await createStoreWarehouse(data.warehouses, newRec[primaryKey]);
      newRec.warehouses = newChildRec;
    }
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
exports.getStore = async (filter, noOfRecs = null) => {
  console.log("filter: ", JSON.stringify(filter));
  if (filter.id) {
    filter[primaryKey] = filter.id;
    delete filter.id;
  }

  try {
    const repository = dataSource.getRepository(entity);
    if (noOfRecs === 1) {
      // result = await repository.findOne({ where: { [primaryKey]: id } }); //opt #1
      return await repository.findOneBy(filter); //{ [primaryKey]: id } //orderBy
    } else {
      return await repository.find({
        //`order` doesn't work with findBy()
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
exports.updateStore = async (id, newData) => {
  try {
    const repository = dataSource.getRepository(entity);
    //Delete the PK from the payload during UPDATE op., as Hana throws an error.
    if (newData[primaryKey]) {
      delete newData[primaryKey];
    }
    let warehouses;
    if (newData.warehouses) {
      warehouses = newData.warehouses;
      delete newData.warehouses;
    }
    let result = {};
    console.log("Object.keys(newData).length: ", Object.keys(newData).length);
    if (Object.keys(newData).length > 0) {
      result = await repository.update({ [primaryKey]: id }, newData);
    }

    if (warehouses) {
      // let updatedChildRec = [];
      let childRecsForInsertion = [];
      warehouses.forEach(async (rec) => {
        //Update the recs. if they are already in the db
        if (rec[childRecPrimaryKey]) {
          await updateStoreWarehouse(rec[childRecPrimaryKey], rec);
        }
        //else insert them to the db
        else {
          childRecsForInsertion.push(rec);
        }
      });

      //Insert the child recs. whose PK field is null (ie., which are not present in db)
      if (childRecsForInsertion.length > 0) {
        const newChildRecs = await createStoreWarehouse(childRecsForInsertion, id);
        result.warehouses = newChildRecs;
      }
    }
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a Store with the given Id
 * @param {Number}  id  PK
 */
exports.deleteStore = async (id) => {
  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete({ [primaryKey]: id });
  } catch (err) {
    throw err;
  }
};

// module.exports = { createStore, getStore, updateStore, deleteStore }
