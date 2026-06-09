import axios from "axios";
import axiosRetry from "axios-retry";

// console.log("process.env: "+ JSON.stringify(process.env));
// console.log("process.env.NODE_ENV: "+ process.env.NODE_ENV);
// console.log("process.env.REACT_APP_API_BASE_URL: "+ process.env.REACT_APP_API_BASE_URL);

let baseURL = "/api/v1/";

//For Dev site running on '3001' use 'https://192.168.1.18:2021' as base url
if (process.env.NODE_ENV === "development") {
  baseURL = process.env.REACT_APP_API_BASE_URL + baseURL;
}

axios.defaults.withCredentials = true;
const client = axios.create({
  // withCredentials: true,
  baseURL,
  headers: {
    "Content-Type": "application/json", //;charset=utf-8
  },
});

// Intercepts failed requests and retry them
axiosRetry(client, { retries: 3 });

export default client;
