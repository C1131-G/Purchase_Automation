const { dataSource } = require("../../services/database");
const entity = require("../user-session-log");
const primaryKey = "userSessionLogId";
const sortField = "loginTime";

const { recordState } = require("../../config/config");

/**
 * Creates a new UserSessionLog  rec. & returns it
 */
exports.createUserSessionLog = async (data) => {
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
exports.getUserSessionLog = async (filter, noOfRecs = null) => {
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
          [sortField]: "DESC",
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
exports.updateUserSessionLog = async (id, newData) => {
  try {
    const repository = dataSource.getRepository(entity);
    //Delete the PK from the payload during UPDATE op., as Hana throws an error.
    if (newData[primaryKey]) {
      if (!id) {
        id = newData[primaryKey];
      }
      delete newData[primaryKey];
    }

    //TODO: Added below for testing purpose. Need to set both the sessionStatus & logoutTime from
    //controllers/session.controller.js & call updateUserSessionLog() from `delete()`
    //DONE:
    // if(newData["sessionStatus"] === recordState.INACTIVE) {
    //   newData["logoutTime"] = new Date();
    // }

    let result = {};
    // console.log("Object.keys(newData).length: ", Object.keys(newData).length);
    if (Object.keys(newData).length > 0) {
      result = await repository.update({ [primaryKey]: id }, newData);
    }
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a UserSessionLog with the given Id
 * @param {Number}  id  PK
 */
exports.deleteUserSessionLog = async (id) => {
  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete({ [primaryKey]: id });
  } catch (err) {
    throw err;
  }
};

// module.exports = { createUserSessionLog, getUserSessionLog, updateUserSessionLog, deleteUserSessionLog }
