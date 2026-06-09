const { serviceLayerAPI } = require("../config/service-layer-api");
const { getSLConnection } = require("../helper/service-layer-login");
const { generatePassword } = require("../utils/generate-password");
const { sendMail } = require("../helper/send-mail");
const welcomeMail = require("../mail-templates/welcome-mail");

const updateUserDetails = async (req, res, next) => {
  console.log(`updateUserDetails - req.body: ${JSON.stringify(req.body)}`);
  let tempPassword;
  let payload = {
    eMail: req.body.eMail,
    MobilePhoneNumber: req.body.MobilePhoneNumber,
    U_PortalUser: req.body.U_PortalUser,
    U_PortalGroupId: req.body.U_PortalGroupId,
    //U_PortalPassword: req.body.U_PortalPassword,
    U_PortalAccountLocked: req.body.U_PortalAccountLocked,
    U_PortalBadLoginCount: req.body.U_PortalBadLoginCount,
  };
  if (req.body.isNewUser) {
    tempPassword = generatePassword();
    // payload.U_PortalPassword = tempPassword; //set a temp password if it is New User
    payload.U_TempPasswordFlag = "Y"; //when this flag is set, user will be prompted to change the password on Login
  }

  let cookie;
  try {
    cookie = await getSLConnection(req);
  } catch (error) {
    console.log("updateUserDetails: " + JSON.stringify(error));
    next(error);
  }
  if (cookie) {
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    let message = "";
    try {
      let updateResponse = await serviceLayerAPI.patch(`Users(${req.body.InternalKey})`, payload);
      if (
        updateResponse.status == "200" ||
        updateResponse.status == "201" ||
        updateResponse.status == "204"
      ) {
        if (req.body.isNewUser) {
          //const hashedPassword = await generateHash(tempPassword); //sending plain pwd via mail

          const mailBody = welcomeMail.getMailBody(
            req.body.adminUser,
            req.body.userName,
            tempPassword,
          ); //hashedPassword
          if (await sendMail(req.body.eMail, welcomeMail.subject, mailBody)) {
            message = "Portal access invite has been sent to user's email";
          } else {
            //TODO: Need to show this message as "warning" in UI. If I send this msg with Error Code 400 or 500
            //msg will be shown in "orange", but Users list will be refreshed only when "success Code" is sent
            message =
              "Portal access has been given, but unable to send temporary password to user's mail. Please share it manually.";
          }
        } else {
          message = "User details updated successfully";
        }
        res.status(200).send({ message });
      } else {
        res.status(500).send({ message: "Update failed!" });
      }
    } catch (error) {
      console.log("Update User Details - Error: " + error);
      next(error);
    }
  }
};

module.exports = { updateUserDetails };
