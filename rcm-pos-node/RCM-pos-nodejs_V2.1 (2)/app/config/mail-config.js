const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  //Gmail service
  /*host: "smtp.gmail.com",
  //port: 587, secure: false,
  port: 465, secure: true, //use SSL
  logger: true,
  auth: {
      user: "somemailid.123@gmail.com",
      pass: "asdfdsf"
  }*/

  //mail server
  //host: 'mail.server.com',
  //port: 110, //using this port for "secure: false" threw this error {"code":"EPROTOCOL"}
  //secure: true, // use SSL

  /*port: 25, this port & secure combo WORKS
  secure: false,*/
  host: process.env.SMTP_SERVER,
  /* port: 587,
  secure: true, // use SSL */

  /** Using UNSECURED port threw belwo err,
   *   {"code":"EAUTH","response":"535 5.7.139 Authentication unsuccessful,
   *   SmtpClientAuthentication is disabled for the Tenant. Visit https://aka.ms/smtp_auth_disabled
   *   for more information.
   *   [SGAP274CA0008.SGPP274.PROD.OUTLOOK.COM 2023-02-20T05:44:24.427Z 08DB12960D5C7667]",
   *   "responseCode":535,"command":"AUTH LOGIN"}
   */
  port: 25,
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  //Added below to fix {"code":"ESOCKET","command":"CONN"} error when sending mail
  tls: {
    rejectUnauthorized: false, // do not fail on invalid certs
  },
});

module.exports = { transporter };
