import React, { Suspense } from "react";
// node.js library that concatenates classes (strings)
import classnames from "classnames";
// reactstrap components
import {
  Button,
  Container,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Input,
  InputGroupAddon,
  InputGroupText,
  InputGroup,
  Table,
  Row,
  Col,
  Spinner,
} from "reactstrap";
import { Edit } from "react-feather";
import api from "../../config/api-nodejs";
import { showWarningMsg } from "../../config/util.js";
import Header from "../../components/Headers/Header";
import { portalModules, permissions, httpStatusCodes } from "../../config/config";
import FavouriteButton from "../../components/FavouriteButton";
import { UserPermissionsContext } from "../../contexts/UserPermissionsContext";

const EditPopup = React.lazy(() => import("./EditPopup"));

const moduleName = portalModules.USER;

class UserDetails extends React.Component {
  static contextType = UserPermissionsContext;

  constructor(props) {
    super(props);
    this.state = {
      operation: "",
      selectedUser: {},
      allUsersList: [],
      filteredUsers: [],
      warningMsg: "",
      successMsg: "",
      isLoading: false,
    };
  }

  /**
   * Gets all User details from API and sets them to state variables
   */
  getUserList = async () => {
    // console.log("Index - getUserList()");
    this.setState({ isLoading: true });
    //const openOrderAPI = `UserList?$select=DocNum,CardCode,CardName,DocDate,Comments&$filter=DocumentStatus eq 'bost_Open'`;
    try {
      const response = await api.get("/custom/users", {
        params: {
          isPortalUser: this.props.isPortalUser,
          userId: localStorage.getItem("InternalKey"),
        },
      });
      // console.log(`UserList List: ${JSON.stringify(response.data)}`);
      if (Array.isArray(response.data) && response.data.length) {
        this.setState({
          allUsersList: response.data,
          filteredUsers: response.data,
        });
      }
    } catch (error) {
      if (
        error.response &&
        [httpStatusCodes.UNAUTHORIZED, httpStatusCodes.FORBIDDEN].includes(error.response.status)
      ) {
        const { setErrorStatusCode } = this.context;
        setErrorStatusCode(error.response.status);
      } else {
        this.setState({ warningMsg: JSON.stringify(error) });
      }
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /** Invoked from EditPopup */
  saveUserDetails = async (request) => {
    this.setState({ isLoading: true });
    // console.log("saveUserDetails request: "+JSON.stringify(request));
    request.userId = localStorage.getItem("InternalKey");
    //if the user was a non-portal user & if he/she was given portal access now, during the current Edit operation
    if (this.props.isPortalUser === "N" && request.U_PortalUser === "Y") {
      request.isNewUser = true;
      request.adminUser = localStorage.getItem("UserName"); //will be used in the mail sent to new user
    }
    try {
      const response = await api.patch("/service/users", request);
      if (response.data.message) {
        this.setState({
          successMsg: response.data.message,
          /** NOTE: setting this as NULL will block EditPopup's componentDidUpdate to excute
           * unnecessarily (on continuous loop)
           */
          selectedUser: null,
        });
        await this.getUserList();
      }
    } catch (error) {
      console.log(JSON.stringify(error.response.data));
      this.setState({
        warningMsg: error.response.data
          ? error.response.data.message
          : "Internal Error: Couldn't update the user",
      });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /**
   * Filters Users based on the 'searchKey' and returns the matching records.
   * @param {String} searchKey User First Name or Last Name
   */
  handleSearch = (searchKey) => {
    console.log(`Index - handleSearch - ${searchKey}`);
    searchKey = searchKey.trim();
    const { allUsersList } = this.state;
    let filteredUsers = [];

    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }
    allUsersList.forEach((user) => {
      if (
        user.UserName.toUpperCase().indexOf(searchKey) > -1 ||
        (user.U_GroupName && user.U_GroupName.toUpperCase().indexOf(searchKey) > -1) ||
        (user.E_Mail && user.E_Mail.toUpperCase().indexOf(searchKey) > -1)
      ) {
        //console.log(`for - ${openPO.FirstName} - ${openPO.LastName}`)
        filteredUsers.push(user);
      }
    });
    //console.log(`filteredUsers: ${JSON.stringify(filteredUsers)}`);
    this.setState({ filteredUsers });
  };

  /**
   * Removes the selected User.
   * @param {Number} empCode Employee Code of the User that needs to be removed
   */
  deleteUser = async (empCode) => {
    const { allUsersList } = this.state;
    if (allUsersList.length) {
      //Filter out the user with the selected 'empCode' from allUsersList & set the new array back to the 'state'
      let filteredUsers = allUsersList.filter((user) => {
        return user.EmpCode !== empCode;
      });
      this.setState({ allUsersList: filteredUsers });
    }

    /** TODO: Above code is only for testing purpose.
     * Need add code to send the selected User's EmpCode to API to DELETE it & call below method to get updated
     * User List.
     *      await this.getUserList();
     */
  };

  async componentDidMount() {
    // console.log("UserDetails - componentDidMount");
    /**
     * When a user is created or updated, "operation" will be set as "Saved", in which case updated user records must
     * be fetched from API.
     * When Edit popup is closed "operation" will be set as "Cancel", NO action is required at that time
     */
    if (this.state.operation !== "Cancel") await this.getUserList();
  }

  /** Callback function to be executed from child component <UserList> component.
   * Passes the selected User object from child component to this component- UserDetails.
   * This object will be passed to <EditUser> as props.
   * @param {String} operation    "edit" or "create"
   * @param {Object} selectedUser User object that is selected for "edit" opertion.
   *                              This value will be blank {} when the operation is "create"
   */
  setUserDetails = (operation, selectedUser) => {
    // console.log(`UserDetails- operation: ${operation} | selectedUser: ${JSON.stringify(selectedUser)}`);
    this.setState({
      operation,
      selectedUser,
      successMsg: "",
      warningMsg: "",
    });
  };

  render() {
    const { checkUserPermission } = this.context;
    const hasWritePermission = checkUserPermission(moduleName, permissions.WRITE);

    const { operation, selectedUser } = this.state;
    const userListTableHead = ["#", "Username", "Name", "User Group", "Email", "Account Locked"]; // , "Portal User", "Mobile",
    //show the 'Edit' column only if the currently logged in user has the required permission
    if (hasWritePermission) {
      userListTableHead.push("Edit");
    }
    return (
      <>
        {/* Page content */}
        <Row>
          <Col className="order-xl-1" xl="12">
            {/** Popup */}
            {operation === "Edit" || operation === "Create" ? (
              //<Suspense fallback={<div>Loading...</div>}>
              <EditPopup
                operation={operation}
                selectedUser={selectedUser}
                setUserDetails={this.setUserDetails}
                saveUserDetails={this.saveUserDetails}
                isPortalUser={this.props.isPortalUser}
              />
            ) : //</Suspense>
            null}
            {/** User Table */}
            <Row>
              <Col className="mb-5 mb-xl-0" xl="12">
                <Card className="bg-white shadow">
                  <CardHeader className="border-0 mb--1 mt--2">
                    <Row className="align-items-center border-bottom mt--3">
                      <Col md="6">
                        {/* <h3 className="mb-1.5"> User List </h3> */}
                        <div className="mb-2">
                          <i className="fa fa-info-circle text-blue" /> &nbsp;
                          <small>
                            {this.props.isPortalUser === "Y"
                              ? "Enter Employee Code, First Name or Last Name to perform search"
                              : "Edit a user and update their Email to enable Neo access"}
                          </small>
                        </div>
                      </Col>
                      <Col className="text-right" md="5">
                        <div className="mb-2 mt--2">
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
                          ) : null}{" "}
                          &emsp;
                          {this.state.isLoading && (
                            <Spinner color="primary" className="reload-spinner" />
                          )}
                        </div>
                      </Col>
                      <Col className="text-right mt-2" md="1">
                        {/* <FavouriteButton /> */}
                      </Col>
                    </Row>
                    <Row>
                      <FormGroup
                        className={classnames({
                          focused: this.state.searchAltFocused,
                        })}
                      >
                        <InputGroup className="input-group mb--4 ml-3 mt-3" size="sm">
                          {/** NOTE: input-group-alternative */}
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="ni ni-zoom-split-in" />
                            </InputGroupText>
                          </InputGroupAddon>
                          <Input
                            placeholder="Search"
                            type="text"
                            onFocus={(e) => this.setState({ searchAltFocused: true })}
                            onBlur={(e) => this.setState({ searchAltFocused: false })}
                            //TODO: Need to clear the Input box value when the Popup window is closed
                            //after a Save or Create operation
                            onKeyUp={(e) => this.handleSearch(e.target.value)}
                          />
                        </InputGroup>
                      </FormGroup>
                    </Row>
                  </CardHeader>
                  {/**<Card className="mt--2 shadow">
                <CardBody> */}
                  <Card className="table-fixed-head table-fixed-head-lg">
                    <Table size="sm" className="align-items-center table-flush" responsive>
                      <thead className="thead-light">
                        <tr>
                          {userListTableHead.map((headerCol, key) => {
                            return (
                              //let the Last Header column be aligned "center" & the rest use "left" alignment
                              headerCol === "Edit" ? (
                                <th scope="col" key={key} style={{ textAlign: "center" }}>
                                  {headerCol}
                                </th>
                              ) : (
                                <th scope="col" key={key}>
                                  {headerCol}
                                </th>
                              )
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(this.state.filteredUsers) &&
                        this.state.filteredUsers.length ? (
                          this.state.filteredUsers.map((user, key) => {
                            return (
                              <tr key={user.InternalKey}>
                                <td>{key + 1}</td>
                                <td style={{ width: "10%" }} className="text-primary">
                                  <b>{user.UserCode}</b>
                                </td>
                                <th className="mb-0 text-sm" scope="row">
                                  {user.UserName}
                                </th>
                                {/* style={{width:"10px"}} */}
                                <th className="mb-0 text-sm" scope="row">
                                  {user.U_GroupName}
                                </th>
                                {/* <td>{user.MobileNo}</td> */}
                                <td>{user.E_Mail}</td>
                                {/* <td style={{ textAlign:"center" }}>
                              {user.U_PortalUser === "Y" ?
                                <div className="badge badge-pill badge-primary">
                                  YES
                                </div>
                              : <div className="badge badge-pill badge-warning">
                                  NO
                                </div>
                              }
                            </td> */}
                                <td style={{ textAlign: "center" }}>
                                  {user.U_PortalAccountLocked === "Y" ? (
                                    <div className="badge badge-pill badge-danger">YES</div>
                                  ) : (
                                    <div className="badge badge-pill badge-success">NO</div>
                                  )}
                                </td>
                                {hasWritePermission && (
                                  <td style={{ textAlign: "center" }}>
                                    <Edit
                                      size={20}
                                      className="mr-1 pb-1 text-primary cursor-pointer"
                                      // style={{cursor: "pointer"}}
                                      onClick={() => this.setUserDetails("Edit", user)}
                                    />
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            {/** Warning msg should span across the width of the table, so setting 'colSpan' with no. of columns */}
                            <td colSpan={userListTableHead.length}>
                              {this.state.isLoading ? (
                                <span className="text-primary mr-20 text-sm">
                                  Loading please wait...
                                </span>
                              ) : (
                                showWarningMsg("No records found")
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card>
                  {/*</CardBody></Card>*/}
                </Card>
              </Col>
            </Row>
            {/*
            <Card className="bg-white shadow">
              <CardHeader className="border-1 mb--4"> {/**bg-white}
                <Row className="align-items-center">
                  <Col xs="8">
                    <h3 className="mb-0">User List</h3>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="mt--3 mb--4 shadow">
      
              </CardBody>
            </Card> */}
          </Col>
        </Row>
      </>
    );
  }
}

export default UserDetails;
