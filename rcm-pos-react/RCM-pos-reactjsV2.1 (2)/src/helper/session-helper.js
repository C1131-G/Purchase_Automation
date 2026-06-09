import api from "../config/api-nodejs";

const baseURI = "/custom/session";
/**
 * Gets the User Session Data
 * @returns session data
 */
const getSessionInfo = async () => {
  try {
    const response = await api.get(baseURI);
    // if(process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
    //   console.log(`getSessionInfo: ${JSON.stringify(response.data)}`);
    // }
    //Empty obj. {} will be returned from the backend if the session has expired
    if (response.data && Object.keys(response.data).length > 0) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a Session in the backend
 * @returns
 */
const deleteSession = async () => {
  try {
    const response = await api.delete(`${baseURI}/logout`);
    return response.status == "200" || response.status == "201" || response.status == "204"
      ? true
      : false;
  } catch (error) {
    throw error;
  }
};

export { getSessionInfo, deleteSession };
