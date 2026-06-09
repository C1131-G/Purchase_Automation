const path = require("path");
const { transporter } = require("../config/mail-config");

/**
 * Sends mail
 * @param {String} mailId
 * @param {String} subject
 * @param {String} body
 */
const sendMail = async (mailId, subject, body) => {
  //console.log(`mail: ${mailId} | subject: ${subject} | body: ${body}`);
  //let buffer = await getDataAsExcel(request.body);
  const message = {
    from: process.env.SMTP_USERNAME,
    //from: "somemailid.123@gmail.com",
    to: mailId,
    subject,
    html: body,
    attachments: [
      //File Stream attachment
      {
        filename: "logo.png",
        path: path.join(__dirname, "../assets/img/client-logo.png"),
        cid: "client_logo_pic",
      },
      {
        filename: "n-app-logo.png",
        path: path.join(__dirname, "../assets/img/n-app-logo.png"),
        cid: "app_logo_pic",
      },
      //Binary Buffer attachment
      // {
      //   filename: `Report_${formatDate(new Date, "MMM D, YYYY")}.xlsx`,
      //   content: Buffer.from(buffer),
      //   cid: 'excel_report'
      // },
      //String attachment - Test
      /*{
        filename: 'test-note.txt',
        content: 'Some notes - abcdefghijklmnopqrstuvwxyz',
        contentType: 'text/plain' // optional, would be detected from the filename
      },*/
    ],
  };

  console.log("__dirname: " + __dirname);
  try {
    console.log("Sending mail....");
    const info = await transporter.sendMail(message);
    console.log("Email sent: " + info.response);
    return true; //"Email successfully sent"
  } catch (error) {
    console.log("sendMail: " + JSON.stringify(error));
    return false;
  }
};

module.exports = { sendMail };
