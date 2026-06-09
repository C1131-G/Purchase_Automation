const { dataSource } = require("../../services/database.js");
const entity = require("../cash-denominations.js");
const primaryKey = "cashDenominationId";
const sortField = "dateTime";

/**
 * Creates a new CashDenomination  rec. & returns it
 */
exports.createCashDenomination = async (data) => {
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
exports.getCashDenominations = async (filter, noOfRecs = null) => {
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
 * Delete a CashDenominations with the given Id
 * @param {Number}  id  PK
 */
exports.deleteCashDenominations = async (id) => {
  try {
    const repository = dataSource.getRepository(entity);
    return await repository.delete({ [primaryKey]: id });
  } catch (err) {
    throw err;
  }
};
