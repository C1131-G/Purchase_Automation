const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Returns the Client's Hostname
 * @param {*} req
 * @returns
 */
const getClientHostname = async (req) => {
  const dns = require("dns");

  // Get the client's IP address from the request headers
  const clientIp = req.connection.remoteAddress;

  // Handle localhost separately
  if (clientIp === "127.0.0.1" || clientIp === "::1") {
    return "localhost";
  }

  return new Promise((resolve, reject) => {
    // Perform a reverse DNS lookup to get the client's hostname
    dns.reverse(clientIp, (err, hostnames) => {
      if (err) {
        console.error(err);
        // reject(err);

        //Return IP address in case of error
        resolve(clientIp);
      } else {
        const clientHostname = hostnames[0] || clientIp;
        resolve(clientHostname);
      }
    });
  });
};

/**
 * Calculates the time diff. b/w two dates & returns the difference in minutes
 * @param {Date} date1
 * @param {Date} date2
 * @returns
 */
const getTimeDifference = (date1, date2) => {
  try {
    // Convert the Date objects to timestamps (milliseconds since Jan 1, 1970)
    const timestamp1 = date1.getTime();
    const timestamp2 = date2.getTime();

    // Calculate the time difference in milliseconds
    const timeDifference = Math.abs(timestamp1 - timestamp2);

    // Convert the time difference to minutes
    const minutesDifference = timeDifference / (1000 * 60);

    return minutesDifference;
  } catch (err) {
    console.log(err);
    return 0;
  }
};

/**
 * Returns a formatted Date value.
 * @param {Date}   date
 * @param {String} format Supported date formats- MMMM D, YYYY | MMM D, YYYY | YYYY-MM-DD
 *                  | YYYY/MM/DD | YYYY-MM-DD HH24:MI:SS | YYYY-MM-DD HH24:MI:SS.FF2
 *                  | DDMMM | DDMM or ddmm
 */
const formatDate = (date, format) => {
  //console.log("Date before: "+ date);
  date = new Date(date);
  //console.log("Date after: "+ date);
  let formattedDate = "NA";
  if (date != "Invalid Date") {
    const day = date.getDate().toString().padStart(2, "0"); //NOTE: str.padStart(targetLength, padString)
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const shortMonth = date.toLocaleString("default", { month: "short" });

    if (format.includes("MMMM D, YYYY"))
      formattedDate = `${months[date.getMonth()]} ${date.getDate()}, ${year}`;
    else if (format.includes("MMM D, YYYY"))
      formattedDate = `${months[date.getMonth()].substr(0, 3)} ${date.getDate()}, ${year}`;
    else if (format.includes("YYYY-MM-DD")) formattedDate = year + "-" + month + "-" + day;
    else if (format.includes("YYYY/MM/DD")) formattedDate = year + "/" + month + "/" + day;
    else if (format === "DD/MM/YYYY") formattedDate = day + "/" + month + "/" + year;
    else if (format === "DD/MM/YY")
      formattedDate = day + "/" + month + "/" + year.toString().substr(-2);
    else if (format === "DDMMM") formattedDate = day + shortMonth;
    else if (["DDMM", "ddmm"].includes(format)) {
      formattedDate = day + month;
    }

    if (format.includes("hh:mm")) {
      let hour = parseInt(date.getHours(), 10);
      console.log("hour: " + hour);
      let period = "AM";
      if (hour > 12) {
        hour -= 12;
        period = "PM";
      } else if (hour === 0) hour = 12;
      formattedDate = `${formattedDate} ${hour}:${date.getMinutes().toString().padStart(2, "0")} ${period}`;
    } else if (format.includes("HH24:MI:SS.FF2")) {
      formattedDate = `${formattedDate} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}.00`;
    } else if (format.includes("HH24:MI:SS")) {
      formattedDate = `${formattedDate} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
    }
  }
  return formattedDate;
};

/**
 * Validates a date value and retrun the result
 * @param {*} value
 * @returns
 */
const isValidDate = (value) => {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

/**
 * Generates Random Nos. to set to records as PRIMARY_KEYs on record creation
 */
const getRandomNo = () => {
  const milliseconds = new Date().getTime();

  const random1 = Math.floor(Math.random() * Math.pow(10, 15));
  const random2 = Math.floor(Math.random() * Math.pow(10, 15));
  console.log("random1: " + random1 + " random2: " + random2 + " millisec: " + milliseconds);
  let num = (milliseconds + random1 + random2).toString();
  return num.slice(num.length - 9); //to get the last 9 digits of the number
};

/**
 * Generates Cron Expression based on the values passed
 * @param {String} cycle      "Daily" or "Weekly" or "Monthly"
 * @param {String} dayOfWeek
 * @param {String} dayOfMonth
 * @param {Number} hour
 * @param {String} minute
 * @param {String} amPm        "AM" or "PM"
 */

const getCronExpression = (cycle, dayOfWeek, dayOfMonth, hour, minute, amPm) => {
  let dom = (month = dow = "*");
  console.log(
    `cycle: ${cycle}, dayOfWeek: ${dayOfWeek}, dayOfMonth: ${dayOfMonth}, hour: ${hour}, minute: ${minute}, amPm: ${amPm}`,
  );

  hour = parseInt(hour);
  if (amPm === "PM" && hour < 12) {
    hour += 12;
  } else if (amPm === "AM" && hour === 12) {
    hour = 0;
  }

  if (cycle === "Weekly") {
    for (let i = 0; i < days.length; i++) {
      if (days[i] === dayOfWeek) {
        dow = i;
      }
    }
  } else if (cycle === "Monthly") {
    dom = dayOfMonth;
  }
  return [minute, hour, dom, month, dow].join(" ");
};

module.exports = {
  formatDate,
  getRandomNo,
  getCronExpression,
  getClientHostname,
  getTimeDifference,
  isValidDate,
};
