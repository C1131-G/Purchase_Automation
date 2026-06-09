import React from "react";
import { months, itemTypes } from "../config/config.js";

/**
 * Checks if the passed value is valid Number & parses into a Float value
 * @param {*} value
 * @returns
 */
export const getValidNumber = (value, precision = 0, allowNegativeNumber = false) => {
  const number = Number(value);
  if (typeof number === "number" && !isNaN(number)) {
    // If allowNegativeNumber is false, ensure the number is greater than 0
    if (!allowNegativeNumber && number <= 0) {
      return 0;
    }

    if (precision) {
      return round(number, precision);
    }
    return number;
  }
  return 0;
};

/**
 * Rounds off the given value to the passed precision
 * @param {Decimal} value
 * @param {Number}  precision
 * @returns
 */
const round = (value, precision = "") => {
  // --OLD
  // let temp = '1';
  // if(!isNaN(precision)) {
  //   for(let i=0; i < precision; i++ ) {
  //     temp += '0'; //append as many zeros as the 'precision'. For eg. precision '3' will
  //                   //make d temp's value '1000'
  //   }
  //   temp = parseInt(temp);
  //   return Math.round(value * temp) / temp;
  // }

  let temp = 1;
  value = !isNaN(parseFloat(value)) ? parseFloat(value) : 0;

  if (value && !isNaN(precision)) {
    for (let i = 0; i < precision; i++) {
      temp *= 10; //multiply by 10 as many times based on the passed 'precision'
    }
    return Math.round(value * temp) / temp;
  }

  return value;
};

/**
 * Check if the passed number has decimals
 */
const isFloat = (num) => {
  return num - Math.floor(num) !== 0;
};

/**
 * Converts the case of the 1st char. in a given string to Upper and returns the new string
 */
const toPascalCase = (title) => {
  return title[0].toUpperCase() + title.slice(1); //'slice' extracts the string startign from 2nd char.
};

/**
 * Displays warning message.
 * @param {String} message  Warning message
 */
const showWarningMsg = (message) => {
  return (
    <span className="text-warning mr-20 text-sm">
      <i className="fa fa-exclamation-triangle" /> &nbsp;
      {message.toString()}
    </span>
  );
};

/**
 * Scrolls and takes the user to a particular element on the page
 * @param {String} elementId ID of the element to which the page must scroll to
 */
export const scrollToElement = (elementId) => {
  const element = document.getElementById(elementId);
  element.scrollIntoView({ behavior: "smooth", block: "center" });
};

/**
 * Returns a formatted Date value.
 * @param {Date}   date
 * @param {String} format Supported date formats- MMMM D, YYYY | MMM D, YYYY | YYYY-MM-DD
 *                  | YYYY/MM/DD | YYYY-MM-DD HH24:MI:SS | YYYY-MM-DD HH24:MI:SS.
 *                  | MMMM D, YYYY hh:mm
 */
const formatDate = (date, format) => {
  // debugger;
  // console.log("Date before: "+ date);
  date = new Date(date);
  // console.log("Date after: "+ date);
  let formattedDate = "";
  if (date != "Invalid Date") {
    const day = date.getDate().toString().padStart(2, "0"); //NOTE: str.padStart(targetLength, padString)
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = daysOfWeek[date.getDay()];

    if (format.includes("MMMM D, YYYY"))
      formattedDate = `${months[date.getMonth()]} ${date.getDate()}, ${year}`;
    else if (format.includes("MMM D, YYYY"))
      formattedDate = `${months[date.getMonth()].substr(0, 3)} ${date.getDate()}, ${year}`;
    else if (format.includes("YYYY-MM-DD")) formattedDate = year + "-" + month + "-" + day;
    else if (format.includes("YYYY/MM/DD")) formattedDate = year + "/" + month + "/" + day;
    else if (format === "DD/MM/YYYY") formattedDate = day + "/" + month + "/" + year;
    else if (format === "DD/MM/YY")
      formattedDate = day + "/" + month + "/" + year.toString().substr(-2);

    if (format === "dddd DD/MM/YY hh:mm:ss a.m.") {
      let hour = parseInt(date.getHours(), 10);
      console.log("hour: " + hour);
      let period = "AM";
      if (hour > 12) {
        hour -= 12;
        period = "PM";
      } else if (hour === 0) {
        hour = 12;
      }
      formattedDate = `${dayOfWeek} ${day}/${month}/${year} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")} ${period}`;
    } else if (format.includes("hh:mm")) {
      let hour = parseInt(date.getHours(), 10);
      // console.log("hour: "+ hour);
      let period = "AM";
      if (hour > 12) {
        hour -= 12;
        period = "PM";
      } else if (hour === 0) {
        hour = 12;
      }
      formattedDate = `${formattedDate} ${hour}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")} ${period}`;
    } else if (format.includes("HH24:MI:SS.FF2")) {
      formattedDate = `${formattedDate} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}.00`;
    } else if (format.includes("HH24:MI:SS")) {
      formattedDate = `${formattedDate} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
    } else if (format === "YYYY-MM-DD HH:mm:ss")
      formattedDate = `${year}-${month}-${day} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }
  return formattedDate;
};

/**
 * Formats the time from SAP in hh:mm format
 * NOTE: Time from SAP will be in HHMM (1435), this function will format it as 2:35 PM
 * @param {*} time
 * @param {*} format
 * @returns
 */
const formatTime = (time, format) => {
  let formatedTime = "";
  if (time) {
    time = time.toString();
    // if(format.includes("hh:mm")) {
    let hour = parseInt(time.substr(0, 2)); //get the 1st 2 digits as Hours
    let minute = time.substr(2, 2);
    console.log("hour: " + hour);
    let period = "AM";
    if (hour > 12) {
      hour -= 12;
      period = "PM";
    } else if (hour === 0) hour = 12;
    formatedTime = `${hour}:${minute} ${period}`;
    // }
  }
  return formatedTime;
};

/**
 * Returns the difference b/w the two given dates/times
 * @param {Date} startTime
 * @param {Date} endTime
 */
const getDiffInMinutes = (startTime, endTime) => {
  startTime = new Date(startTime);
  endTime = new Date(endTime);
  const diff = (startTime.getTime() - endTime.getTime()) / 1000; //diff. in seconds
  return Math.floor(diff / 60);
};

/**
 * Parses the passed query string and returns the value as object
 * @param {String} url
 */
const parseQueryString = (url) => {
  const arr = url.slice(1).split(/&|=/); // remove the "?", "&" and "="
  let key,
    value,
    params = {};

  for (let i = 0; i < arr.length; i += 2) {
    key = arr[i];
    value = arr[i + 1];
    params[key] = value; // build the object {"st":"approved","t":"2"}
  }
  return params;
};

/**
 * Generates Random Nos. to set to records as PRIMARY_KEYs on record creation
 */
const getRandomNumber = (count) => {
  const milliseconds = new Date().getTime();
  //Random no. generated as 1412701774984576 is saved as 1412701774984580 in the Oracle db
  //Need to reduce the resulting no. to 15 digit or less. If it exceeds 15 digit the above pblm happens
  //DONE: removed two digits from all the below nos.
  const random1 = Math.floor(Math.random() * Math.pow(10, 15));
  const random2 = Math.floor(Math.random() * Math.pow(10, 15));
  console.log("random1: " + random1 + " random2: " + random2 + " millisec: " + milliseconds);
  let num = (milliseconds + random1 + random2).toString();
  return num.slice(num.length - count); //to get the last 9 digits of the number
};

/**
 * Generate Unique Batch & Serial Nos. and return the values
 * @param {String} itemType
 * @param {String} purchaseOrderNo  Purchase Order#- added as a prefix for Batch Nos.
 * @returns {String} Unique Batch or Serial No. based on the itemType
 */
const generateUniqueNumber = (itemType, purchaseOrderNo) => {
  let today = new Date();
  if (itemType === itemTypes.BATCHES) {
    //replaced 'this.state.selectedPurchaseOrderNo' with 'purchaseOrderNo', for Multi-PO feature
    //return `${purchaseOrderNo}-${formatDate(today, "DD/MM/YY")}-${today.getTime().toString().substr(-5)}-POS`;
    if (purchaseOrderNo) {
      return `${purchaseOrderNo}-${formatDate(today, "DD/MM/YY")}-${getRandomNumber(5)}-POS`;
    } else {
      return `${getRandomNumber(3)}-${formatDate(today, "DD/MM/YY")}-${getRandomNumber(5)}-POS`;
    }
  } else if (itemType === itemTypes.SERIAL_NUMBERS) {
    return `T/${today.getFullYear().toString().substr(-2)}/${getRandomNumber(6)}-POS`;

    //below doesnt generate UNIQUE nos., so replaecd it with getRandomNumber()
    // return `T/${today.getFullYear().toString().substr(-2)}/${today.getTime().toString().substr(-6)}`;
  }
};

const randomInRange = (min, max) => {
  return Math.random() * (max - min) + min;
};

/**
 * Gets the 'status' filter & 'tab' selection from SessionStorage
 * that was set in the Dashboard screen
 */
const getDashboardTileSelection = () => {
  let draftStatus = "ALL",
    wizardTab = 1;
  let dashboardTile = sessionStorage.getItem("SELECTED_DASHBOARD_TILE");
  console.log("dashboardTile : " + JSON.stringify(dashboardTile));
  if (dashboardTile) {
    dashboardTile = JSON.parse(dashboardTile);
    draftStatus = dashboardTile.status;
    wizardTab = dashboardTile.tab;
  }
  return { draftStatus, wizardTab };
};

/** Clears user info  from LocalStorage */
const clearLocalStorage = function () {
  localStorage.setItem("InternalKey", "");
  localStorage.setItem("UserCode", "");
  localStorage.setItem("UserName", "");
  localStorage.setItem("MobilePhoneNumber", "");
  localStorage.setItem("eMail", "");
  localStorage.setItem("permissions", "");
  localStorage.setItem("loginTime", "");
};

/** Removes HTML tags from the passed string
 * @param {String} htmlString
 */
const stripHTML = (htmlString) => {
  /* Some banks fill up Call templates when submitting tickets which are added to Call Desc. too.
   * Remove verbages that appears before "Summary of Issue: "
   */
  let issueSummIndex = htmlString.indexOf("Summary of issue: ");
  //to remove "From", "To" mail ids if entire mail content is copied to Call Desc. when creating a Call
  let subjectIndex = htmlString.indexOf("Subject: ");
  if (issueSummIndex > 0) htmlString = htmlString.substr(issueSummIndex);
  else if (subjectIndex > 0) htmlString = htmlString.substr(subjectIndex);

  /* NOTE: This code doesn't replace <br /> with New line but rest of the tags are removed as expected */
  var doc = new DOMParser().parseFromString(htmlString, "text/html");
  return doc.body.textContent || htmlString;
};

const getErrorMessageFromResponse = (error) => {
  let errorMsg = "";
  //To catch 401 error
  if (typeof error.response.data.message != "undefined") {
    errorMsg = error.response.data.message; //Error code: ${error.response.status}
  }
  //to catch error messages from Service Layer
  else if (typeof error.response.data.error.message != "undefined") {
    errorMsg = `Error code: ${error.response.data.error.code}. Message: ${error.response.data.error.message.value}`;
  } else if (typeof error.response.data.error != "undefined") {
    errorMsg = `Error: ${error.response.data.error}`;
  } else if (error.request) {
    errorMsg = error.request;
  } else if (error.message) {
    errorMsg = error.message;
  } else {
    errorMsg = JSON.stringify(error);
  }
  return errorMsg;
};

export {
  showWarningMsg,
  formatDate,
  formatTime,
  getDiffInMinutes,
  parseQueryString,
  getRandomNumber,
  generateUniqueNumber,
  randomInRange,
  getDashboardTileSelection,
  round,
  isFloat,
  clearLocalStorage,
  stripHTML,
  getErrorMessageFromResponse,
  toPascalCase,
};
