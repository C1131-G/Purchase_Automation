const { dataSource } = require("../../services/database");
const Store = require("../stores");
const StoreCounters = require("../store-counters");
const StoreUsers = require("../store-users");

/**
 * Checks if the a User has access to a specific Counter
 * @param {*} userId
 * @param {*} counterId
 * @returns boolean
 */
exports.isUserAssignedToCounter = async (userId, counterId) => {
  try {
    //below method can be useful in JOINing tables that are not related
    // const queryBuilder = dataSource.createQueryBuilder(Stores, "store")
    //   .innerJoin(StoreUsers, "user", "user.storeId = store.storeId")
    //   .innerJoin(StoreCounters, "counter", "counter.storeId = store.storeId")
    //   .where("user.userId = :userId", { userId })
    //   .andWhere("counter.storeCounterId = :counterId", { counterId });

    const queryBuilder = dataSource
      .getRepository(Store)
      .createQueryBuilder("store")
      //using `innerJoinAndSelect` instead `innerJoin` will return records from `storeUsers` table too
      .innerJoin("store.storeUsers", "user")
      .innerJoin("store.storeCounters", "counter")
      .where("user.userId = :userId", { userId })
      .andWhere("counter.storeCounterId = :counterId", { counterId });

    const result = await queryBuilder.getOne();
    console.log("isUserAssignedToCounter - result: ", result);
    return !!result; // Return true if a result is found, otherwise false
  } catch (err) {
    throw err;
  }
};
