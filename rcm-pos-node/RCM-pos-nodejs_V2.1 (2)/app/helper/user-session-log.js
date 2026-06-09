const { isUserAssignedToCounter } = require("../entities/helper/stores.helper");
const { isCounterOccupied } = require("../entities/helper/user-session-log.helper");

/**
 * Checks if the selected Counter is available in the Store to which the user is assigned
 * & checks if no other user has logged in to the selected Counter today
 * @param {*} userId
 * @param {*} storeCounterId
 * @returns
 */
exports.canAssignUserToCounter = async (userId, storeCounterId) => {
  try {
    const isUserHasAccess = await isUserAssignedToCounter(userId, storeCounterId);
    if (isUserHasAccess) {
      const isOccupied = await isCounterOccupied(storeCounterId);
      if (!isOccupied) {
        return true;
      } else {
        throw new Error(
          "Counter already occupied by another user. Make sure you have selected the correct counter!",
        );
      }
    } else {
      throw new Error("User doesnt have access to this Counter. Please contact Admin!");
    }
  } catch (err) {
    throw err;
  }
};
