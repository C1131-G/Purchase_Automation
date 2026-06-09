import React, { Suspense } from "react";
// node.js library that concatenates classes (strings)
import classnames from "classnames";
// reactstrap components
import {
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  FormGroup,
  Input,
  CustomInput,
  Table,
  Button,
  Spinner,
  Nav,
  NavItem,
  NavLink,
  Popover,
  PopoverBody,
  ListGroup,
  ListGroupItem,
} from "reactstrap";
import { ChevronsRight, Trash2, Circle, Sun, Loader } from "react-feather";

import Header from "../../../components/Headers/Header";
import Radio from "../../../components/CustomRadio/CustomRadio";
import { showWarningMsg } from "../../../config/util.js";
import api from "../../../config/api-nodejs";
import { portalModules, permissions } from "../../../config/config";
import FavouriteButton from "../../../components/FavouriteButton";
//import { userRolesList, permissionsList } from "./testRolesPerm";
import { getUserGroupsList, getUserGroupPermissions } from "../../../helper/user-helper";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";

const moduleName = portalModules.USER_GROUP;
class UserGroups extends React.Component {
  static contextType = UserPermissionsContext;

  constructor(props) {
    super(props);
    this.state = {
      userGroups: [],
      userGroupsWithPermissionsList: [],
      activeUserGroupId: "",
      activePermissionsList: [],
      newPermissionsList: [],
      modulesList: [],
      action: "",
      displayMode: "VIEW",
      newUserGroup: "",
      isLoading: false,
      successMsg: "",
      warningMsg: "",
      inValidInput: "",
      operation: "",
      selectedUser: {},
      popoverOpen: false,
    };
  }

  togglePopover = () => {
    this.setState((state) => ({ popoverOpen: !state.popoverOpen }));
  };

  handleChange = (name, value) => {
    this.setState({
      [name]: value,
      inValidInput: "",
      warningMsg: "",
    });
  };

  /** Get All Portal modules */
  getModulesList = async () => {
    if (Array.isArray(this.state.modulesList) && this.state.modulesList.length)
      return this.state.modulesList;
    else {
      this.setState({
        isLoading: true,
      });
      try {
        let response = await api.get("custom/modules");
        console.log("modulesList: " + JSON.stringify(response));
        if (Array.isArray(response.data) && response.data.length) {
          this.setState({ modulesList: response.data });
          return response.data;
        }
      } catch (error) {
        this.setState({ warningMsg: error.response });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  /**
   * Gets the list of Modules that are not present in the currently selected permission list
   * @param {Array} permissionsList Currently selected permission list in which missing modules should be checked
   */
  getMissingModules = async (permissionsList) => {
    console.log("getMissingModules - permissionList: " + JSON.stringify(permissionsList));
    let modulesList = await this.getModulesList();
    let newPermissionsList = [];
    try {
      modulesList = modulesList.slice(); //using a copy of 'modulesList',
      //without this 'modulesList' in 'state' got mutated causing in some weird behaviour on the UI
      //Get the list of Modules that are not present to the current Permission list
      if (Array.isArray(permissionsList) && permissionsList.length) {
        permissionsList.forEach((permission) => {
          for (let i = modulesList.length - 1; i >= 0; i--) {
            console.log(
              "permission.U_ModuleId %s | mod.U_ModuleId %s",
              permission.U_ModuleId,
              modulesList[i].U_ModuleId,
            );
            if (permission.U_ModuleId === modulesList[i].U_ModuleId) {
              modulesList.splice(i, 1);
            }
          }
        });
      }
      console.log("Missing module %s", JSON.stringify(modulesList));
      if (Array.isArray(modulesList) && modulesList.length) {
        newPermissionsList = modulesList.map((mod) => {
          return {
            U_GroupId: permissionsList[0].U_GroupId, //set the current Group's Id,
            //this will be used when sending this to api for saving data to db
            U_PermissionId: "",
            U_ModuleName: mod.U_ModuleName,
            U_ModuleId: mod.U_ModuleId,
            U_AllowRead: "N",
            U_AllowWrite: "N",
            U_AllowCancel: "N",
            U_AllowCreate: "N",
          };
        });
      }
      console.log("getMissingModules - newPermissionsList %s", JSON.stringify(newPermissionsList));
      return newPermissionsList;
    } catch (error) {
      this.setState({ warningMsg: error.response });
    }
  };

  /**
   * Adds the list of Modules that are not present in the currently selected permission list
   * @param {Array} permissionsList Currently selected permission list to which missing modules should be added
   */
  addMissingModules = async (permissionsList) => {
    console.log("getMissingModules - permissionList: " + JSON.stringify(permissionsList));
    let modulesList = await this.getModulesList();
    let newPermissionsList = [];
    try {
      modulesList = modulesList.slice(); //using a copy of 'modulesList',
      //without this 'modulesList' in 'state' got mutated causing in some weird behaviour on the UI
      //Get the list of Modules that are not present to the current Permission list
      if (Array.isArray(permissionsList) && permissionsList.length) {
        permissionsList.forEach((permission) => {
          for (let i = modulesList.length - 1; i >= 0; i--) {
            console.log(
              "permission.U_ModuleId %s | mod.U_ModuleId %s",
              permission.U_ModuleId,
              modulesList[i].U_ModuleId,
            );
            if (permission.U_ModuleId === modulesList[i].U_ModuleId) {
              modulesList.splice(i, 1);
            }
          }
        });
      }
      console.log("Missing module %s", JSON.stringify(modulesList));
      if (Array.isArray(modulesList) && modulesList.length) {
        newPermissionsList = modulesList.map((mod) => {
          return {
            U_GroupId: permissionsList[0].U_GroupId, //set the current Group's Id,
            //this will be used when sending this to api for saving data to db
            U_PermissionId: "",
            U_ModuleName: mod.U_ModuleName,
            U_ModuleId: mod.U_ModuleId,
            U_AllowRead: "N",
            U_AllowWrite: "N",
            U_AllowCancel: "N",
            U_AllowCreate: "N",
          };
        });
      }

      //Remove Records whose ModuleName or ModuleId is NULL
      /* This code is required bcoz, by default SAP has NULL record as the last row in each table, so
      an additional row with all columns as NULL is sent from teh API which is removed here
      */
      if (Array.isArray(permissionsList) && permissionsList.length) {
        for (let i = permissionsList.length - 1; i >= 0; i--) {
          if (permissionsList[i].U_ModuleId == null || permissionsList[i].U_ModuleName == null) {
            permissionsList.splice(i, 1);
          }
        }
      }
      console.log("getMissingModules - newPermissionsList %s", JSON.stringify(newPermissionsList));
      return permissionsList.concat(newPermissionsList);
    } catch (error) {
      this.setState({ warningMsg: error.response });
    }
  };

  /**
   * Get unique User Group records to populate the 'User Group' section in UI
   * @param {Array} userGroupsListWithPermissions User Groups with all the permissions under them
   */
  getUserGroupsList = (userGroupsListWithPermissions) => {
    let userGroups = [];
    userGroupsListWithPermissions.forEach((rec) => {
      if (userGroups.length) {
        /** NOTE: This check is to eliminate duplicate Group entries in 'userGroups' which will make the same
         * GroupNmae appear more than once in under 'User Group' section
         */
        //Add the userGroup to the array only if it doesn't exist in it already
        if (!userGroups.some((group) => group.U_GroupId === rec.U_GroupId)) {
          userGroups.push({
            U_GroupId: rec.U_GroupId,
            U_GroupName: rec.U_GroupName,
          });
        }
      } else {
        userGroups.push({
          U_GroupId: rec.U_GroupId,
          U_GroupName: rec.U_GroupName,
        });
      }
    });
    console.log("userGroups: " + JSON.stringify(userGroups));
    return userGroups;
  };

  handlePermissionChange = (moduleId, field, event) => {
    const value = event.target.checked ? "Y" : "N";
    let activePermissionsList = this.state.activePermissionsList.slice();
    activePermissionsList.forEach((permission) => {
      if (permission.U_ModuleId === moduleId) {
        permission[field] = value;
      }
    });
    this.setState({ activePermissionsList });
  };

  handleCreateEdit = async (action) => {
    this.setState({
      action,
      displayMode: "EDIT",
      successMsg: "",
      warningMsg: "",
    });

    if (action === "CREATE") {
      const { modulesList } = this.state;
      this.setState({ activeUserGroupId: "" });
      if (Array.isArray(modulesList) && modulesList.length) {
        let activePermissionsList = modulesList.map((mod) => {
          return {
            U_GroupId: "",
            U_PermissionId: "",
            U_ModuleName: mod.U_ModuleName,
            U_ModuleId: mod.U_ModuleId,
            U_AllowRead: "N",
            U_AllowWrite: "N",
            U_AllowCancel: "N",
            U_AllowCreate: "N",
          };
        });
        this.setState({
          activePermissionsList,
        });
      }
    }
  };

  handleSave = async () => {
    this.setState({ isLoading: true });
    let activeUserGroupId,
      activeGroupName,
      missingPermissionList = [],
      activePermissionsList = [];
    if (this.state.action === "CREATE" && !this.state.newUserGroup) {
      this.setState({
        warningMsg: "Please enter Group name",
        inValidInput: "is-invalid",
        isLoading: false,
      });
    } else {
      console.log("activePermissionsList: " + JSON.stringify(this.state.activePermissionsList));
      let response;
      const request = {
        userId: localStorage.getItem("InternalKey"),
        U_GroupId: this.state.action === "CREATE" ? "" : this.state.activeUserGroupId,
        U_GroupName:
          this.state.action === "CREATE" ? this.state.newUserGroup : this.state.activeGroupName,
        permissionsList: this.state.activePermissionsList,
      };
      try {
        if (this.state.action === "CREATE") {
          response = await api.post("/custom/user-groups", request);
        } else {
          response = await api.put("/custom/user-groups", request);
        }
        console.log("handleSave response: " + JSON.stringify(response));

        if (Array.isArray(response.data) && response.data.length) {
          // to retain the current Active Group when an Edit operation is performed
          if (this.state.action === "CREATE") {
            activeUserGroupId = response.data[0].U_GroupId;
            activeGroupName = response.data[0].U_GroupName;
          } else {
            activeUserGroupId = this.state.activeUserGroupId;
            activeGroupName = this.state.activeGroupName;
          }
          activePermissionsList = response.data.filter((group) => {
            return group.U_GroupId === activeUserGroupId;
          });
          missingPermissionList = await this.addMissingModules(activePermissionsList);
          console.log("activePermissionsList %s", JSON.stringify(activePermissionsList));
          this.setState({
            userGroups: this.getUserGroupsList(response.data),
            userGroupsWithPermissionsList: response.data,
            activeUserGroupId,
            activeGroupName,
            activePermissionsList: missingPermissionList,
            action: "SAVE",
            displayMode: "VIEW",
            successMsg:
              this.state.action === "CREATE"
                ? "New User Group added successfully!"
                : "User group updated successfully!",
          });
        }
      } catch (error) {
        if (error.response.status == 401) {
          this.setState({
            warningMsg: error.response.data.message,
          });
        } else this.setState({ warningMsg: error.response.data.error });
      } finally {
        this.setState({
          newUserGroup: "",
          isLoading: false,
        });
      }
    }
  };

  handleDelete = async (roleId) => {
    let activeUserGroupId,
      activeGroupName,
      missingPermissionList = [],
      activePermissionsList = [];
    this.togglePopover();
    this.setState({ isLoading: true });
    try {
      const response = await api.delete("/custom/user-groups/" + roleId, {
        params: { userId: localStorage.getItem("InternalKey") },
      });
      console.log("handleDelet response: " + JSON.stringify(response));

      if (Array.isArray(response.data) && response.data.length) {
        console.log("handleDelete: " + JSON.stringify(response.data));
        activeUserGroupId = response.data[0].U_GroupId;
        activeGroupName = response.data[0].U_GroupName;
        activePermissionsList = response.data.filter((group) => {
          return group.U_GroupId === activeUserGroupId;
        });
        missingPermissionList = await this.addMissingModules(activePermissionsList);
        console.log("activePermissionsList %s", JSON.stringify(activePermissionsList));
        this.setState({
          userGroups: this.getUserGroupsList(response.data),
          userGroupsWithPermissionsList: response.data,
          activeUserGroupId,
          activeGroupName,
          activePermissionsList: missingPermissionList,
          successMsg: "User group deleted successfully!",
          displayMode: "VIEW",
        });
      }
    } catch (error) {
      console.log("error.response: " + JSON.stringify(error.response));
      console.log("error status: " + error.response.status);
      if (error.response.status == 401) {
        this.setState({
          warningMsg: error.response.data.message,
        });
      } else if (error.response.status == 400) {
        this.setState({
          warningMsg: `Please remove the user(s) '${error.response.data.users}' from this group to delete it`,
        });
      } else {
        this.setState({
          warningMsg: error.response.data.error,
        });
      }
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleCancel = async () => {
    this.setState({
      displayMode: "VIEW",
      successMsg: "",
      warningMsg: "",
    });

    /** perform below operations only when the Cancel btn was clicked to cancel the "Create" operation,
     * bcoz Create action resets the activeUserGroupId & activePermissionsList so they must be reloaded again
     */

    if (this.state.action === "CREATE") {
      let missingPermissionList = [];
      const { userGroupsWithPermissionsList } = this.state;
      const activeUserGroupId = userGroupsWithPermissionsList[0].U_GroupId;
      const activeGroupName = userGroupsWithPermissionsList[0].U_GroupName;
      console.log(
        "userGroupsWithPermissionsList: " + JSON.stringify(userGroupsWithPermissionsList),
      );
      const activePermissionsList = userGroupsWithPermissionsList.filter((group) => {
        return group.U_GroupId === activeUserGroupId;
      });
      console.log("handleCancel - activePermissionsList: " + JSON.stringify(activePermissionsList));
      try {
        missingPermissionList = await this.addMissingModules(activePermissionsList);
        console.log("handleCancel - missingPermissionList" + JSON.stringify(missingPermissionList));
        this.setState({
          newPermissionsList: [],
          action: "",
          activeUserGroupId, //set the 1st User Group as active
          activeGroupName,
          activePermissionsList: missingPermissionList,
        });
      } catch (error) {
        this.setState({ warningMsg: error });
      }
    }
  };

  handleUserGroupDropdownChange = (value) => {};

  handleUserGroupClick = async (activeUserGroupId, activeGroupName) => {
    console.log("UserGroupID: " + activeUserGroupId);
    let missingPermissionList = [];
    // let activePermissionsList = this.state.userGroupsWithPermissionsList.filter(group => {
    //   // if(group.U_ModuleName != null) {
    //     console.log("group.U_ModuleName: "+ group.U_ModuleName);
    //     return group.U_GroupId === activeUserGroupId;
    //   // }
    // });

    this.setState({ isLoading: true });
    const activePermissionsList = await getUserGroupPermissions(activeUserGroupId);
    try {
      missingPermissionList = await this.addMissingModules(activePermissionsList);
      this.setState({
        activeUserGroupId,
        activeGroupName,
        activePermissionsList: missingPermissionList,
      });
    } catch (error) {
      this.setState({ warningMsg: error });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  async componentDidMount() {
    console.log("UserGroups - componentDidMount");
    this.setState({ isLoading: true });
    try {
      // const response = await api.get("/custom/user-groups",
      //   { params: {userId: localStorage.getItem("InternalKey")} });
      const response = await getUserGroupsList();
      if (Array.isArray(response) && response.length) {
        console.log("response[0].U_GroupId: " + JSON.stringify(response));
        const activeUserGroupId = response[0].U_GroupId;
        const activeGroupName = response[0].U_GroupName;
        const activePermissionsList = await getUserGroupPermissions(activeUserGroupId);
        // activePermissionsList = response.filter(group => {
        //   return group.U_GroupId === activeUserGroupId
        // });
        const missingPermissionList = await this.addMissingModules(activePermissionsList);
        //console.log("activePermissionsList %s", JSON.stringify(activePermissionsList));
        this.setState({
          userGroups: this.getUserGroupsList(response),
          userGroupsWithPermissionsList: response,
          activeUserGroupId,
          activeGroupName,
          activePermissionsList: missingPermissionList,
        });
      }
    } catch (err) {
      if (err.response) this.setState({ warningMsg: err.response.data.message });
      else if (err.message) this.setState({ warningMsg: err.message });
      else this.setState({ warningMsg: JSON.stringify(err) });
    } finally {
      this.setState({ isLoading: false });
    }
    //displayMode: "READONLY"
  }

  render() {
    const { checkUserPermission } = this.context;
    const { activePermissionsList } = this.state;
    //= this.state.action === "CREATE" ? this.state.newPermissionsList : this.state.activePermissionsList;
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt-3" fluid>
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-white shadow">
                <CardHeader>
                  <Row className="align-items-center">
                    {" "}
                    {/** border-bottom */}
                    <Col md="4">
                      <h3 className="mb-1.5"> Manage User Groups </h3>
                      <div>
                        {" "}
                        {/**  className="mb-2" */}
                        <i className="fa fa-info-circle text-blue" /> &nbsp;
                        <small>Create new User Groups, add/edit Permissions</small>
                      </div>
                    </Col>
                    <Col className="text-right" md="5">
                      {this.state.successMsg ? (
                        <span className="text-success mr-20 small">
                          <i className="fa fa-info-circle" /> &nbsp;
                          {this.state.successMsg}
                        </span>
                      ) : this.state.warningMsg ? (
                        <span className="text-warning mr-20 small">
                          <i className="fa fa-exclamation-triangle" /> &nbsp;
                          {this.state.warningMsg}
                        </span>
                      ) : null}
                      &emsp;
                    </Col>
                    <Col className="text-right" md="2">
                      {this.state.isLoading ? (
                        <Spinner color="primary" className="reload-spinner" />
                      ) : this.state.displayMode === "VIEW" ? (
                        <>
                          {checkUserPermission(moduleName, permissions.CREATE) && (
                            <Button
                              color="primary"
                              // href="#"
                              onClick={() => this.handleCreateEdit("CREATE")}
                              size="sm"
                            >
                              Create
                            </Button>
                          )}
                          {checkUserPermission(moduleName, permissions.WRITE) && (
                            <Button
                              color="primary"
                              // href="#"
                              onClick={() => this.handleCreateEdit("EDIT")}
                              size="sm"
                            >
                              Edit
                            </Button>
                          )}
                        </>
                      ) : this.state.displayMode === "EDIT" ? (
                        <>
                          <Button
                            color="primary"
                            // href="#"
                            onClick={() => this.handleSave()}
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            color="danger"
                            // href="#"
                            onClick={(e) => this.handleCancel()}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}
                    </Col>
                    <Col className="text-right mt-2 pt-2" md="1">
                      {/* <FavouriteButton /> */}
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody className="mt--2 mb--3">
                  {" "}
                  {/** shadow */}
                  <Row>
                    <Col sm="5" md="3">
                      <h6 className="heading-small text-muted mb-3">User Groups</h6>
                      <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-2 mt--1 mb-3 shadow-xl">
                        {" "}
                        {/** text-center */}
                        <Row className="mt-2">
                          {/** NOTE: "text-sm" is slightly bigger than "small". "text-xs" is smaller than "small" */}
                          <span className="text-muted small font-weight-500"></span>
                          <Nav vertical>
                            {this.state.action === "CREATE" ? ( //"EDIT"
                              <Row>
                                {/* Icon doesnt align properly with the textbox, so commented it out */}
                                <ChevronsRight
                                  size={20}
                                  className={classnames("ml-4 mt-2 pb-1 pl-1", "text-primary")}
                                />
                                <Input
                                  bsSize="sm"
                                  style={{
                                    width: 55 + "%",
                                    borderTop: 0,
                                    borderLeft: 0,
                                    borderRight: 0,
                                  }}
                                  value={this.state.newUserGroup}
                                  /** NOTE: Added "display-4 text-gray-dark" to change the size and color of the Textbox font */
                                  className={
                                    "mb-1 form-control display-4 text-gray-dark " +
                                    this.state.inValidInput
                                  }
                                  id="input-user-group"
                                  placeholder="Enter new group"
                                  type="text"
                                  onChange={(event) =>
                                    this.handleChange("newUserGroup", event.target.value)
                                  }
                                />
                              </Row>
                            ) : null}
                            {this.state.userGroups.map((group) => {
                              return (
                                <NavItem key={group.U_GroupId}>
                                  <NavLink
                                    // href="#"
                                    style={{
                                      cursor:
                                        this.state.action === "CREATE" ? "default" : "pointer",
                                    }}
                                    disabled={this.state.action === "CREATE" ? true : false}
                                    active={
                                      this.state.activeUserGroupId == group.U_GroupId ? true : false
                                    }
                                    className="py-2 text-md"
                                    // onClick={() => this.handleUserGroupClick(group.U_GroupId, group.U_GroupName)}
                                  >
                                    {this.state.activeUserGroupId == group.U_GroupId &&
                                    this.state.displayMode === "EDIT" &&
                                    checkUserPermission(moduleName, permissions.CANCEL) ? (
                                      <>
                                        <Popover
                                          placement="top"
                                          target={`group_${group.U_GroupId}`}
                                          className="popover-warning"
                                          isOpen={this.state.popoverOpen}
                                        >
                                          <PopoverBody className="text-center">
                                            <span className="text-gray-dark text-xs mb-2 font-weight-600">
                                              Are you sure you want to delete?
                                            </span>{" "}
                                            <br />
                                            <Button
                                              outline
                                              color="primary"
                                              // href="#"
                                              onClick={() => this.handleDelete(group.U_GroupId)}
                                              size="sm"
                                            >
                                              Yes
                                            </Button>
                                            <Button
                                              outline
                                              color="danger"
                                              // href="#"
                                              onClick={this.togglePopover}
                                              size="sm"
                                            >
                                              No
                                            </Button>
                                          </PopoverBody>
                                        </Popover>
                                        <Trash2
                                          id={`group_${group.U_GroupId}`}
                                          size={20}
                                          className="mr-1 pb-1 text-danger cursor-pointer"
                                          //onClick={() => this.handleDelete(group.U_GroupId)}
                                          onClick={this.togglePopover}
                                        />
                                      </>
                                    ) : (
                                      <ChevronsRight
                                        size={20}
                                        className={classnames(
                                          "mr-1 pb-1",
                                          this.state.activeUserGroupId == group.U_GroupId
                                            ? "text-primary"
                                            : "",
                                        )}
                                      />
                                    )}
                                    {/*<i className="ni ni-user-run mr-2" />*/}
                                    <span
                                      className={classnames(
                                        "mb-1 text-sm font-weight-600 cursor-pointer",
                                        this.state.activeUserGroupId == group.U_GroupId
                                          ? "text-primary"
                                          : "",
                                      )}
                                      onClick={() =>
                                        this.handleUserGroupClick(
                                          group.U_GroupId,
                                          group.U_GroupName,
                                        )
                                      }
                                    >
                                      {group.U_GroupName}
                                    </span>
                                  </NavLink>
                                </NavItem>
                              );
                            })}
                          </Nav>
                        </Row>
                      </Card>
                    </Col>
                    <Col md="9">
                      <h6 className="heading-small text-muted mb-3">Permissions</h6>
                      <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-0 mt--1 mb-3 shadow-xl">
                        {" "}
                        {/** text-center */}
                        <Row className="mt-2">
                          <Table borderless responsive>
                            <thead>
                              <tr>
                                <th className="font-weight-900">Module</th>
                                <th className="font-weight-900">Read</th>
                                <th className="font-weight-900">Write</th>
                                <th className="font-weight-900">Create</th>
                                <th className="font-weight-900">Cancel/Delete</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(activePermissionsList) && activePermissionsList.length
                                ? activePermissionsList.map((permission) => {
                                    return (
                                      /**NOTE: Earlier I was using U_PermissionId as "key" as below
                              <tr key={permission.U_PermissionId}>
                            
                            ..found below error in the console when I clicked on Create & then Cancel btn
                            Warning: Encountered two children with the same key, ``.
                            Keys should be unique so that components maintain their identity across updates.
                            Non-unique keys may cause children to be duplicated and/or omitted

                            Reason: U_PermissionId would be `` (blank) for new Group when clicking on "Create"
                            */
                                      <tr
                                        key={`${permission.U_ModuleId}${permission.U_PermissionId}`}
                                      >
                                        <td>{permission.U_ModuleName}</td>
                                        <td>
                                          <CustomInput
                                            inline
                                            type="checkbox"
                                            //key={permission.U_AllowRead}
                                            id={`checkbox_U_AllowRead${permission.U_ModuleId}`}
                                            label=""
                                            checked={permission.U_AllowRead === "Y" ? true : false}
                                            disabled={
                                              this.state.displayMode === "EDIT" ? false : true
                                            }
                                            onChange={(e) =>
                                              this.handlePermissionChange(
                                                permission.U_ModuleId,
                                                "U_AllowRead",
                                                e,
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <CustomInput
                                            inline
                                            type="checkbox"
                                            id={`checkbox_U_AllowWrite_${permission.U_ModuleId}`}
                                            label=""
                                            checked={permission.U_AllowWrite === "Y" ? true : false}
                                            disabled={
                                              this.state.displayMode === "EDIT" ? false : true
                                            }
                                            onChange={(e) =>
                                              this.handlePermissionChange(
                                                permission.U_ModuleId,
                                                "U_AllowWrite",
                                                e,
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <CustomInput
                                            inline
                                            type="checkbox"
                                            id={`checkbox_U_AllowCreate${permission.U_ModuleId}`}
                                            label=""
                                            checked={
                                              permission.U_AllowCreate === "Y" ? true : false
                                            }
                                            disabled={
                                              this.state.displayMode === "EDIT" ? false : true
                                            }
                                            onChange={(e) =>
                                              this.handlePermissionChange(
                                                permission.U_ModuleId,
                                                "U_AllowCreate",
                                                e,
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <CustomInput
                                            inline
                                            type="checkbox"
                                            id={`checkbox_U_AllowCancel${permission.U_ModuleId}`}
                                            label=""
                                            checked={
                                              permission.U_AllowCancel === "Y" ? true : false
                                            }
                                            disabled={
                                              this.state.displayMode === "EDIT" ? false : true
                                            }
                                            onChange={(e) =>
                                              this.handlePermissionChange(
                                                permission.U_ModuleId,
                                                "U_AllowCancel",
                                                e,
                                              )
                                            }
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })
                                : null}
                            </tbody>
                          </Table>
                        </Row>
                      </Card>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default UserGroups;
