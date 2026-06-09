const { httpStatusCodes } = require("../config/config");
/**
 * Returns the error message & status based on teh error thrown by Service Layer API
 * @param {Object} error  Error obj. that is thrown by Service Layer
 */

const serviceLayerErrorHandler = (error) => {
  let statusCode = httpStatusCodes.INTERNAL_SERVER_ERROR,
    message = "Unexpected error! Contact Admin.";
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log("error.response.data" + JSON.stringify(error.response.data));
    console.log("error.response.status:" + error.response.status);
    console.log("error.response.headers: " + JSON.stringify(error.response.headers));
    if (error.response.status) {
      statusCode = error.response.status;
      message = error.response.data.error.message.value;
    }
    /*res.status(error.response.status).json({
      //message: error.response.data.error,
      message: error.response.data.error.message.value,
    });*/
  } else if (error.message) {
    message = error.message;
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.log("error.request: " + JSON.stringify(error.request));
    /*res.status(500).send({
      message: error.request
    });*/
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log("Catch else - Error", error.message);
    /*res.status(500).json({
      message: error.message
    });*/
  }
  if (error.code) {
    // To set Status 500 when the code is 2XX. UI considers 2XX as success & doesnt throw error msgs
    statusCode = error.code >= 300 ? error.code : httpStatusCodes.INTERNAL_SERVER_ERROR;
  }
  // res.status(statusCode).json({ message });
  return { statusCode, message };
  //console.log(error.config);
};

module.exports = { serviceLayerErrorHandler };
