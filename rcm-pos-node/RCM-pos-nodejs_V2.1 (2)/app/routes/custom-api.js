const express = require("express");
const customAPI = require("../controllers/custom-api");
const userAPI = require("../controllers/custom-api-user");
const batchSerialAPI = require("../controllers/custom-batch-serial");
const approvalTemplateAPI = require("../controllers/custom-approval-template");
const stockTransferRequest = require("../controllers/custom-stock-transfer-request");
const stockTransfer = require("../controllers/custom-stock-transfers");

const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");
const router = new express.Router();

router.route("/server-date").get(customAPI.getServerDateTime);

router.route("/get-docentry").get(customAPI.getDocEntry);

router.route("/login").post(userAPI.validateUserLogin);

router.route("/forgot-password").post(userAPI.handleForgotPassword);

router.route("/update-password").patch(userAPI.updatePortalPassword);

router.route("/temp-password").post(userAPI.generateTempPassword);

router.route("/branch").get(customAPI.getUserBranches);

router.route("/freights").get(customAPI.getFreightList);

router.route("/item").get(customAPI.getItemsList);

router.route("/item-qty-in-warehouse").get(customAPI.getItemCountInWarehouse);

//STR Creation screen
router.route("/bin-location/:type?").get(customAPI.getBinsAndItemQtyForWarehouse);

router.route("/modules").get(customAPI.getPortalModules);

router
  .route("/approval-template/:recordType?/:templateId?/:lineId?")
  .get(
    checkUserPermission(portalModules.APPROVAL, permissions.READ),
    approvalTemplateAPI.getApprovalTemplates,
  )
  .put(
    checkUserPermission(portalModules.APPROVAL, permissions.WRITE),
    approvalTemplateAPI.createUpdateApprovalTemplate,
  )
  .post(
    checkUserPermission(portalModules.APPROVAL, permissions.CREATE),
    approvalTemplateAPI.createUpdateApprovalTemplate,
  )
  .delete(approvalTemplateAPI.deleteApprovalTemplate);

//Used for testign via Postman
// router.route("/approval-template/:recordType?/:templateId?/:lineId?")
// .get(approvalTemplateAPI.getApprovalTemplates)
// .put(approvalTemplateAPI.createUpdateApprovalTemplate)
// .post(approvalTemplateAPI.createUpdateApprovalTemplate)
// .delete(approvalTemplateAPI.deleteApprovalTemplate);

router.route("/users").get(userAPI.getAllUsers);

router.route("/portal-users").get(userAPI.getPortalUsersList);

router
  .route("/user-groups/:id?")
  .get(checkUserPermission(portalModules.USER_GROUP, permissions.READ), userAPI.getAllPortalGroups)
  .put(
    checkUserPermission(portalModules.USER_GROUP, permissions.WRITE),
    userAPI.createUpdateUserGroupWithPermissions,
  )
  .post(
    checkUserPermission(portalModules.USER_GROUP, permissions.CREATE),
    userAPI.createUpdateUserGroupWithPermissions,
  )
  .delete(
    checkUserPermission(portalModules.USER_GROUP, permissions.CANCEL),
    userAPI.deletePortalUserGroup,
  );

//Get Permissions under a Group
router
  .route("/user-groups/:id?/permissions")
  .get(
    checkUserPermission(portalModules.USER_GROUP, permissions.READ),
    userAPI.getPortalUserPermissions,
  );

//TODO: Need to change this query to accomodate `Users with Multiple Group` feature
//Get All Users under a UserGroup
router.get("/user-groups/:groupName/user", userAPI.getUsersByUserGroup);

//TODO: Need to change this to accomodate `Users with Multiple Group` feature
//TODO: Need to change all the queries that use OUSR."U_PortalGroupId" field
//Get User Permissions based on UserId
router.get("/user/:userId/permissions", userAPI.getUserPermissions);

/** Stock Transfer Request */
// Moved this to a new separate routes file
router
  .route("/stock-transfer-request/:type?/:recordType?/:docEntry?")
  .get(
    checkUserPermission(portalModules.STOCK_TRANSFER_REQUEST, permissions.READ) ||
      checkUserPermission(portalModules.STOCK_TRANSFER, permissions.CREATE),
    stockTransferRequest.getTransferRequestRecords,
  );

/** Stock Transfer */
router
  .route("/stock-transfer/:type?/:recordType?/:docEntry?")
  .get(
    checkUserPermission(portalModules.STOCK_TRANSFER, permissions.READ),
    stockTransfer.getTransferRecords,
  );

//to get the record count to display in the user Dashboard
router.route("/count").get(customAPI.getDraftsCount);

router.route("/batch-serial-info").get(customAPI.getBatchSerialNoInfo).patch(batchSerialAPI.patch);

router.route("/tim-yard-items").get(customAPI.getTimYardItemInfo);

router.route("/bincode-info").get(customAPI.getBinListbyItem);

module.exports = router;
