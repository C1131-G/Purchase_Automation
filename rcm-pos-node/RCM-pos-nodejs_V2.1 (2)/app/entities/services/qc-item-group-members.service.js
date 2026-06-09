/**
 * SAMPLE - NOT Required for POS
 */

const { dataSource } = require("../../services/database");

const entity = require("../qc-item-group-members");
const primaryKey = "itemGroupMemberId";
exports.parentPrimaryKey = "itemGroupId";

/**
 * Creates a new QCItemGroupMember rec. & returns it
 * @param {Object Array} data  New data
 * @param {Number} parentId Parent rec's ID
 */
exports.createQCItemGroupMember = async (data, parentId) => {
  try {
    let dataWithFK;
    if (Array.isArray(data)) {
      dataWithFK = data.map((rec) => {
        return { ...rec, [this.parentPrimaryKey]: parentId }; //Add Parent rec's PK to each child rec.
      });
    } else {
      dataWithFK = { ...data, [this.parentPrimaryKey]: parentId };
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
exports.getQCItemGroupMember = async (filter, noOfRecs = null) => {
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
      return await repository.findBy(filter);
    }
  } catch (err) {
    throw err;
  }
};

/**
 * @param {Number}  id PK
 * @param {Object}  newData New data to be updated into the db
 */
exports.updateQCItemGroupMember = async (id, newData) => {
  try {
    const repository = dataSource.getRepository(entity);
    //Delete the PK from the payload during UPDATE op., as Hana throws this error.
    //INSERT, UPDATE and UPSERT are disallowed on the generated field:
    //cannot update generated identity column field
    if (newData[primaryKey]) {
      delete newData[primaryKey];
    }
    return await repository.update({ [primaryKey]: id }, newData);
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a QCItemGroupMember with the given Id
 * @param {Number}  id  PK
 */
exports.deleteQCItemGroupMember = async (filter) => {
  if (filter.id) {
    filter[primaryKey] = filter.id;
    delete filter.id;
  }
  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete(filter);
  } catch (err) {
    throw err;
  }
};

// module.exports = { createQCItemGroupMember, getQCItemGroupMember, updateQCItemGroupMember, deleteQCItemGroupMember,
//   parentPrimaryKey }
