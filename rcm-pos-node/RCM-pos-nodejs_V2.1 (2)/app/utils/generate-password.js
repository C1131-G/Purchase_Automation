/**
 * Generates temp password for new users
 */
const generatePassword = () => {
  const passwordLength = 8;
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1234567890"; //!@#$%^&*()-+<>
  let password = "";
  for (let i = 0; i < passwordLength; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

module.exports = { generatePassword };
