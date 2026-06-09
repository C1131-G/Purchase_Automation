const axios = require("axios");
const axiosRetry = require("axios-retry").default;

//axios.defaults.withCredentials = true;
const serviceLayerAPI = axios.create({
  baseURL: process.env.SERVICE_LAYER_API_BASE_URL,
  //withCredentials: true,
  headers: {
    //"Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
    //Access-Control-Allow-Credentials: true,
    //"Content-Type": "text/plain;charset=utf-8",
    "Content-Type": "text/json;charset=utf-8",
    //"Content-Type": "application/json;charset=utf-8",
  },
});

// Intercepts failed requests and retry them
axiosRetry(serviceLayerAPI, { retries: 3 });

module.exports = { serviceLayerAPI };
