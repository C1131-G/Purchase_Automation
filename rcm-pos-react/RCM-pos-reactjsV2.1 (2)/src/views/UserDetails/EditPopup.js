import React from "react";
import PropTypes from "prop-types";
// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  Input,
  CustomInput,
  Label,
  Row,
  Col,
  Modal,
  CardFooter,
  Spinner,
} from "reactstrap";
import { Tooltip } from "reactstrap";

import api from "../../config/api-nodejs";
import { generateTempPassword } from "../../helper/user-helper";
import { portalModules, permissions, displayModes } from "../../config/config";
import "../../assets/css/custom-style.scss";

import { UserPermissionsContext } from "../../contexts/UserPermissionsContext";
import UserGroupDropdown from "../components/UserGroupDropdown";
import UserGroups from "./UserGroups";

const moduleName = portalModules.USER;
class EditPopup extends React.Component {
  static contextType = UserPermissionsContext;

  constructor(props) {
    super(props);
    /**NOTE: Initialled I named the var as "isMounted", which threw below error when I tried to open the popup,
     *    Uncaught TypeError: Cannot set property isMounted of #<Component> which has only a getter
     * Adding an _ prefix fixed the issue
     */
    this._isMounted = false;
    this.state = {
      error: "",
      popupWarningMsg: "",
      popupWindow: false,
      selectedUser: {},
      userGroupsList: [],
      internalKey: "",
      userName: "",
      userGroupId: "",
      userGroupName: "",
      mobile: "",
      email: "",
      isNeoUser: "",
      isAccountLocked: "",
      badLoginCount: "",
      invalidInput: {},
    };
  }

  toggleModal = (name) => {
    console.log("toggleModal");
    /**
     * Added cond. to check Component "mounted" status to fix below warning 
     *    Warning: Can't perform a React state update on an unmounted component.
     *    This is a no-op, but it indicates a memory leak in your application.
     *    To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
    in EditPopup (at UserDetails.js:62)
    in Suspense (at UserDetails.js:61)
     */
    if (this._isMounted) {
      this.setState({
        [name]: !this.state[name],
      });
    }
  };

  handleGeneratePassword = async () => {
    this.setState({ isLoading: true });
    try {
      const tempPassword = await generateTempPassword(this.state.internalKey);
      // const tempPassword = await generateTempPassword(this.state.userName, this.state.email);
      console.log("tempPassword: ", tempPassword);
      this.setState({ tempPassword });
    } catch (err) {
      this.setState({ warningMsg: err.response });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleCheckboxChange = (name) => (event) => {
    const value = event.target.checked;
    this.setState({ [name]: value ? "Y" : "N" });
  };

  handleUserGroupChange = (value) => {
    this.setState({ userGroupId: value, invalidInput: {}, popupWarningMsg: "" });
  };

  handleFieldChange = (name) => (event) => {
    let { invalidInput } = this.state;
    const value = event.target.value.trim();

    if (name === "mobile" && isNaN(value)) {
      invalidInput[name] = "is-invalid";
      this.setState({
        [name]: "",
        invalidInput,
        popupWarningMsg: "Enter a valid Mobile No.",
      });
    } else {
      this.setState({
        [name]: value,
        invalidInput: {},
        popupWarningMsg: "",
      });
    }
  };

  /** Closes the popup and clears certain data from "state" variables when Cancel button is clicked */
  cancelPopup = () => {
    this.toggleModal("popupWindow");
    this.setState({
      popupWarningMsg: "",
      selectedUser: {},
      internalKey: "",
      userName: "",
      userGroupId: "",
      userGroupName: "",
      mobile: "",
      email: "",
      isNeoUser: "",
      isAccountLocked: "",
      badLoginCount: "",
      isLoading: false,
      invalidInput: {},
    });
    //Reset "state" variables in the Parent Component when the popup is closed
    this.props.setUserDetails("Cancel", {});
  };

  /** Set the User details from "props" to "state" and open the pop-up window
   */
  openPopup = () => {
    if (this.props.operation === "Edit") {
      console.log(`EditPopup- operation: ${this.props.operation}`);
      this.setState({
        internalKey: this.props.selectedUser.InternalKey,
        userName: this.props.selectedUser.UserName,
        password: this.props.selectedUser.U_PortalPassword,
        userGroupId: this.props.selectedUser.U_PortalGroupId,
        userGroupName: this.props.selectedUser.U_GroupName,
        mobile: this.props.selectedUser.MobileNo,
        email: this.props.selectedUser.E_Mail,
        isNeoUser: this.props.selectedUser.U_PortalUser,
        isAccountLocked: this.props.selectedUser.U_PortalAccountLocked,
        badLoginCount: this.props.selectedUser.U_PortalBadLoginCount,
      });
    }
    this.toggleModal("popupWindow");
  };

  /**
   * Validates the entered data before sending them API
   */
  saveUserDetails = () => async (event) => {
    event.preventDefault();
    let { invalidInput } = this.state;

    this.setState({ isLoading: true });

    //null is displayed as "blank" in UI, so just checking for "" doesnt work
    if (["", null, "null"].includes(this.state.mobile)) {
      invalidInput.mobile = "is-invalid";
      this.setState({
        popupWarningMsg: "Enter Mobile No.",
        invalidInput,
      });
    } else if (["", "null", null].includes(this.state.email)) {
      invalidInput.email = "is-invalid";
      this.setState({
        popupWarningMsg: "Enter Email",
        invalidInput,
      });
    } else if (["", "null", null].includes(this.state.userGroupId)) {
      invalidInput.userGroupId = "is-invalid";
      this.setState({
        popupWarningMsg: "Select a User Group",
        invalidInput,
      });
    } else {
      //prop names used in "request" payload below are taken from Service Layer sample "response"
      const request = {
        InternalKey: this.state.internalKey,
        userName: this.state.userName,
        eMail: this.state.email,
        MobilePhoneNumber: this.state.mobile,
        U_PortalUser: this.state.isNeoUser,
        U_PortalGroupId: this.state.userGroupId,
        //U_PortalPassword: this.state.password,
        U_PortalAccountLocked: this.state.isAccountLocked,
        U_PortalBadLoginCount: this.state.badLoginCount,
      };
      //Add EmpCode when the operation is "Edit"
      /*if (this.props.operation === "Edit") {
        request.internalKey = this.state.internalKey;
      }
      //Set default password for New Users
      if (this.props.operation === "Create") {
        request.Password = defaultPassword;
        console.log("request.Password: "+ request.Password);
      }*/
      this.props.saveUserDetails(request);
      this.toggleModal("popupWindow");

      this.setState({
        popupWarningMsg: "",
        selectedUser: {},
        internalKey: "",
        userName: "",
        userGroupId: "",
        userGroupName: "",
        mobile: "",
        email: "",
        isNeoUser: "",
        isAccountLocked: "",
        badLoginCount: "",
        isLoading: false,
        invalidInput: {},
      });

      /** Set "state" variables in the Parent Component when the popup is closed, this is sent back to <UserList>
       * where User list will be updated based on the "operation"
       */
      //this.props.setUserDetails("Saved", {});
    }
  };

  async componentDidUpdate(prevProps, prevState) {
    //console.log("prevProp: "+ JSON.stringify(prevProps.selectedUser))
    //console.log("prevState: "+ JSON.stringify(prevState.selectedUser))
    if (this.props.selectedUser !== null && prevProps.selectedUser === null) {
      this.openPopup();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    console.log("EditPopup - componentDidMount");
    this._isMounted = true;
    this.openPopup();
  }

  render() {
    const { checkUserPermission } = this.context;
    const { popupWarningMsg, invalidInput } = this.state;
    return (
      <>
        {/** Popup */}
        <Modal
          size="lg" //if this prop is not set then the Modal size will be 'medium'
          className="modal-dialog-centered"
          isOpen={this.state.popupWindow}
          toggle={() => this.toggleModal("popupWindow")}
          backdrop={"static"} //true - clicking outside the Modal will close the Modal.
          //       Modal will have a gray transparent bg
          //false - Modal doesn't close when clicking outside, but the bg will be transparent
          //'static' - Modal doesn't close when clicking outside & it will have a gray bg too
          keyboard={false} //true - pressing Esc button in the Keyboard will close the Modal
          //style={{height: 500+"px", overflow: "auto"}}
        >
          {/** <div className="modal-header">
          <h3 className="mb-1 mt--1">{this.props.operation + " - "} User </h3>
          Hiding the 'x' button
          <button
            aria-label="Close"
            className="close"
            data-dismiss="modal"
            type="button"
            onClick={() => this.toggleModal("popupWindow")}
          >
            <span aria-hidden={true}>×</span>
          </button>
        </div>
        <div className="modal-body">*/}
          {/** Form */}
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-white shadow">
                <CardHeader className="bg-white border-1">
                  <Row className="align-items-center">
                    <Col xs="12">
                      <h3 className="mb-0">{this.props.operation} User </h3>
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody className="mt--3">
                  <Form>
                    <h6 className="heading-small text-muted mb-3">User information</h6>
                    <div className="pl-lg-2">
                      <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 bg-white shadow-xl">
                        {" "}
                        {/** text-center */}
                        <Row>
                          <Col md="4">
                            <small className="text-muted">User Name</small>
                            <h4 className="mt-1">{this.state.userName}</h4>
                          </Col>
                          <Col md="4">
                            <small className="text-muted">Mobile#</small>
                            <FormGroup className="mt-1">
                              <Input
                                bsSize="sm"
                                style={{ width: 70 + "%" }}
                                value={this.state.mobile}
                                className={
                                  "form-control display-4 text-gray-dark " + invalidInput.mobile
                                }
                                id="input-mobile"
                                placeholder="Enter Mobile#"
                                type="text"
                                onChange={this.handleFieldChange("mobile")}
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <small className="text-muted">Email</small>
                            <FormGroup className="mt-1">
                              <Input
                                bsSize="sm"
                                style={{ width: 100 + "%" }}
                                value={this.state.email}
                                className={
                                  "form-control display-4 text-gray-dark " + invalidInput.email
                                }
                                id="input-email"
                                placeholder="Enter Email id"
                                type="email"
                                onChange={this.handleFieldChange("email")}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                      </Card>
                    </div>
                    {/** <hr className="my-4" /> */}
                    <h6 className="heading-small text-muted mb-3">Account Information</h6>
                    <div className="pl-lg-2">
                      <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 bg-white shadow-xl">
                        <Row>
                          <Col sm="4">
                            <FormGroup>
                              <small className="text-muted mb-3">User Group</small>
                              <UserGroupDropdown
                                groupId={this.state.userGroupId}
                                handleChange={this.handleUserGroupChange}
                                displayMode={
                                  checkUserPermission(moduleName, permissions.CREATE)
                                    ? displayModes.EDIT
                                    : displayModes.VIEW
                                }
                              />
                              {/* {!checkUserPermission(moduleName, permissions.CREATE) ?
                              <h4 className="mt-1">{this.state.userGroupName}</h4>
                            : 
                            <Input
                              bsSize="sm"
                              type="select"
                              value={this.state.userGroupId}
                              style={{ width: "auto" }}
                              className={"form-control display-4 text-gray-dark " + invalidInput.userGroupId}
                              onChange={this.handleFieldChange("userGroupId")}
                            >
                              <option key={0} value={""}>Select a Group</option>
                              {this.state.userGroupsList.map(mod => {
                                //NOTE: The below GroupIds are not included for testing purpose
                                // if (mod.U_GroupId != "666" && mod.U_GroupId != "3453") {
                                  return (
                                    <option key={mod.U_GroupId} value={mod.U_GroupId}>
                                      {mod.U_GroupName}
                                    </option>
                                  )
                                // }
                              })}
                            </Input>
                            } */}
                            </FormGroup>
                          </Col>
                          <Col sm="4">
                            <FormGroup>
                              <CustomInput
                                inline
                                id="isNeoUser"
                                type="checkbox"
                                label="Is POS User"
                                className="text-gray-dark display-4 mt-4"
                                checked={this.state.isNeoUser === "Y" ? true : false}
                                //disabled={this.state.displayMode === "EDIT" ? false : true}
                                onChange={this.handleCheckboxChange("isNeoUser")}
                              />
                            </FormGroup>
                          </Col>
                          <Col sm="4">
                            <FormGroup>
                              <CustomInput
                                inline
                                id="isAccountLocked"
                                type="checkbox"
                                label="Is Account Locked"
                                className="text-gray-dark display-4 mt-4"
                                checked={this.state.isAccountLocked === "Y" ? true : false}
                                //disabled={this.state.displayMode === "EDIT" ? false : true}
                                onChange={this.handleCheckboxChange("isAccountLocked")}
                              />
                            </FormGroup>
                          </Col>
                          <Col sm="4">
                            <small className="text-muted">Bad Login Count</small>
                            <h4 className="mt-1">
                              {this.state.badLoginCount ? this.state.badLoginCount : "NA"}
                            </h4>
                          </Col>
                          {this.state.tempPassword ? (
                            <Col sm="3">
                              <small className="text-muted">Temp Password</small>
                              <h4 className="mt-1">{this.state.tempPassword}</h4>
                            </Col>
                          ) : (
                            ""
                          )}
                        </Row>
                      </Card>
                    </div>
                    {/* <UserGroups
                      userId={this.state.internalKey}
                      displayMode={checkUserPermission(moduleName, permissions.CREATE) ?
                        displayModes.EDIT : displayModes.VIEW}
                    /> */}
                  </Form>
                </CardBody>
                <CardFooter className="bg-white modal-footer mt--4">
                  <Col md="3" className="text-left pl-4">
                    {this.state.isLoading ? (
                      <Spinner color="primary" className="reload-spinner" />
                    ) : // Display the button only When `Custom` login is enabled
                    process.env.REACT_APP_USE_CUSTOM_LOGIN === "true" &&
                      this.props.isPortalUser === "Y" ? (
                      <Button size="sm" color="primary" onClick={this.handleGeneratePassword}>
                        Generate Temp Password
                      </Button>
                    ) : null}
                  </Col>
                  <Col md="6">
                    {popupWarningMsg !== "" ? (
                      <span className="text-warning mr-2 small">
                        <i className="fa fa-exclamation" /> &nbsp;
                        {popupWarningMsg}
                      </span>
                    ) : null}
                  </Col>
                  <Col md="3" className="text-right">
                    <Button
                      size="sm"
                      color="primary"
                      type="button"
                      onClick={this.saveUserDetails()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      //className="ml-auto" //this will move the 'Save' button to the left side of the modal
                      color="danger"
                      data-dismiss="modal"
                      type="button"
                      onClick={() => this.cancelPopup()}
                    >
                      Cancel
                    </Button>
                  </Col>
                </CardFooter>
              </Card>
            </Col>
          </Row>
          {/*</div>*/}
        </Modal>
      </>
    );
  }
}
export default EditPopup;

EditPopup.propTypes = {
  operation: PropTypes.string.isRequired,
  //selectedUser: PropTypes.object.isRequired,
  setUserDetails: PropTypes.func.isRequired,
};
