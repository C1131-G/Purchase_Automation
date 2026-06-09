const { Between } = require("typeorm");
const { dataSource } = require("../../services/database");
const entity = require("../user-session-log");
const { recordState } = require("../../config/config");

/**
 * Checks if another user has already logged in from the counter today
 * @param storeCounterId
 * @returns
 */
exports.isCounterOccupied = async (storeCounterId) => {
  const repository = dataSource.getRepository(entity);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Check if any user session log exists for the counter on the current date with an ACTIVE session status
  const existingSession = await repository.findOne({
    where: {
      storeCounterId,
      loginTime: Between(startOfDay.toISOString(), endOfDay.toISOString()), //WO toISOString() it didnt work
      sessionStatus: recordState.ACTIVE,
    },
  });

  console.log("isCounterOccupied - existingSession: ", existingSession);

  //return true if `counter` is occupied
  return !!existingSession;
};
