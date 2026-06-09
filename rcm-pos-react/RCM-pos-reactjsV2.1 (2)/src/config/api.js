import axios from "axios";

//axios.defaults.withCredentials = true;
export default axios.create({
  //baseURL: 'http://localhost:3000/',
  //baseURL: "http://7a8cb343cd6a.ngrok.io/",
  baseURL: "https://192.168.1.17:50000/b1s/v1/", //Private

  /**
   * HTTPS threw - ERR_CERT_COMMON_NAME_INVALID error.
   * Connected to Login API using HTTP instead of HTTPS,
   * but it then threw 401 when app tries to make next API call (Users)
   */
  //baseURL: 'http://192.168.1.17:50001/b1s/v1/',

  //baseURL: 'https://124.43.10.219:50000/b1s/v1/', //Public IP
  //withCredentials: true,
  headers: {
    //withCredentials: true,
    //'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
    //Access-Control-Allow-Credentials: true,
    //'Content-Type': 'text/plain;charset=utf-8',
    "Content-Type": "text/json;charset=utf-8",
    //'Content-Type': 'application/json;charset=utf-8',
  },
});
