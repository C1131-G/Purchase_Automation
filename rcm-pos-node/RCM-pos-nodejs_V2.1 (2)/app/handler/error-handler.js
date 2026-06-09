const { logError } = require("../services/logger");
const { serviceLayerErrorHandler } = require("./service-layer-error-handler");
const { httpStatusCodes } = require("../config/config");

/** NOTE:
 *    Error-handling middleware always takes FOUR arguments.
 * You must provide four arguments to identify it as an error-handling middleware function.
 * Even if you don’t need to use the `next` object, you must specify it to maintain the signature.
 * Otherwise, the `next` object will be interpreted as regular middleware and will fail to handle errors
 **/
const errorHandler = (err, req, res, next) => {
  console.error(err);
  let { statusCode, message } = serviceLayerErrorHandler(err);
  if (!statusCode) {
    statusCode = err.statusCode || httpStatusCodes.INTERNAL_SERVER_ERROR;
  }
  if (!message) {
    message = err.detail ? err.detail : err.message ? err.message : err;
  }

  logError({
    // op: "Operation!",
    method: req.method,
    url: req.url,
    statusCode,
    message,
    stack: err.stack,
    requestBody: req.body,
    requestParams: req.params,
    requestQuery: req.query,
  });
  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
