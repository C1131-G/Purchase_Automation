const bcrypt = require("bcrypt");

/**
 * Hashes the password
 * @param {String} password   Plain password to hash
 */
const generateHash = async (password) => {
  const saltRounds = 10;
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    // console.log("hash: "+ hash);
    return hash;
  } catch (err) {
    throw err;
  }
};

/**
 * Compares the password and returns it
 * @param {String} plainPassword   Plain password from UI
 * @param {String} hash            Hashed password from DB
 */
const comparePassword = async (plainPassword, hash) => {
  let result = false;
  try {
    result = await bcrypt.compare(plainPassword, hash);
    // console.log("comparePassword - result: "+ result);
  } catch (err) {
    console.log("Bcrypt error - comparePassword: " + err);
    //throw err;
  } finally {
    // console.log("comparePassword - result: "+ result);
    return result;
  }
};

module.exports = { generateHash, comparePassword };
