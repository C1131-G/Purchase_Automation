/**
 * SAMPLE - NOT Required for POS
 */

const { dataSource } = require("../../services/database");
const {
  createQCItemGroupMember,
  updateQCItemGroupMember,
} = require("./qc-item-group-members.service");

const entity = require("../qc-item-group");
const primaryKey = "itemGroupId";
const childRecPrimaryKey = "itemGroupMemberId";

/**
 * Creates a new QCItemGroup  rec. & returns it
 */
exports.createQCItemGroup = async (data) => {
  try {
    const repository = dataSource.getRepository(entity);
    const newRec = await repository.save(data);
    if (data.items) {
      // && Array.isArray(data.items) && data.items.length > 0
      const newChildRec = await createQCItemGroupMember(data.items, newRec[primaryKey]);
      newRec.items = newChildRec;
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
exports.getQCItemGroup = async (filter, noOfRecs = null) => {
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
          groupName: "ASC",
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
exports.updateQCItemGroup = async (id, newData) => {
  try {
    const repository = dataSource.getRepository(entity);
    let items;
    if (newData.items) {
      items = newData.items;
      delete newData.items;
    }
    let result = {};
    console.log("Object.keys(newData).length: ", Object.keys(newData).length);
    if (Object.keys(newData).length > 0) {
      result = await repository.update({ [primaryKey]: id }, newData);
    }

    if (items) {
      // let updatedChildRec = [];
      let childRecsForInsertion = [];
      items.forEach(async (rec) => {
        //Update the recs. if they are already in the db
        if (rec[childRecPrimaryKey]) {
          await updateQCItemGroupMember(rec[childRecPrimaryKey], rec);
        }
        //else insert them to the db
        else {
          childRecsForInsertion.push(rec);
        }
      });

      //Insert the child recs. whose PK field is null (ie., which are not present in db)
      if (childRecsForInsertion.length > 0) {
        const newChildRecs = await createQCItemGroupMember(childRecsForInsertion, id);
        result.items = newChildRecs;
      }
    }
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a QCItemGroup with the given Id
 * @param {Number}  id  PK
 */
exports.deleteQCItemGroup = async (id) => {
  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete({ [primaryKey]: id });
  } catch (err) {
    throw err;
  }
};

// module.exports = { createQCItemGroup, getQCItemGroup, updateQCItemGroup, deleteQCItemGroup }
