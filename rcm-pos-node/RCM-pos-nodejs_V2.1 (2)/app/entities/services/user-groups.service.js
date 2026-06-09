const { dataSource } = require("../../services/database");

const entity = require("../user-groups");
const primaryKey = "userGroupId";

/**
 * Creates a new UserGroup  rec. & returns it
 */
exports.createUserGroup = async (data) => {
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
exports.getUserGroup = async (filter, noOfRecs = null) => {
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
        //'order' doesn't work with findBy()
        where: filter,
        order: {
          groupId: "ASC",
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
exports.updateUserGroup = async (id, newData) => {
  try {
    const repository = dataSource.getRepository(entity);
    let result = {};
    console.log("Object.keys(newData).length: ", Object.keys(newData).length);
    if (Object.keys(newData).length > 0) {
      result = await repository.update({ [primaryKey]: id }, newData);
    }
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a UserGroup with the given Id
 * @param {Number}  id  PK
 */
exports.deleteUserGroup = async (id) => {
  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete({ [primaryKey]: id });
  } catch (err) {
    throw err;
  }
};

// module.exports = { createUserGroup, getUserGroup, updateUserGroup, deleteUserGroup }
