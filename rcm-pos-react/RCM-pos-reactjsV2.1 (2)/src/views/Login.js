import React from "react";
import { companyName, companyURL, isBranchEnabled } from "../config/config";

// reactstrap components
import {
  Button,
  Card,
  CardBody,
  FormGroup,
  Form,
  Input,
  InputGroupAddon,
  InputGroupText,
  InputGroup,
  Row,
  Col,
  Spinner,
} from "reactstrap";
import ToastMessage from "../components/ToastMessage";
import api from "../config/api-nodejs";
import { companyNames } from "../config/config";
import { clearLocalStorage } from "../config/util";

import { UserPermissionsContext } from "../contexts/UserPermissionsContext";

console.log("companyName: ", process.env.REACT_APP_COMPANY_NAME);
class Login extends React.Component {
  static contextType = UserPermissionsContext;
  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
  }
  state = {
    userName: localStorage.getItem("Name") ? localStorage.getItem("Name") : "",
    password: "",
    mailId: "",
    newPassword1: "",
    newPassword2: "",
    showPassword: false,
    isConnectedToDB: false,
    successMsg: "",
    warningMsg: "",
    message: "",
    isLoading: false,
    forgotPassword: false,
    tempPasswordFlag: false,
    userLable: false,
    rememberMe: true, //localStorage.getItem("Name") ? true : false
  };

  toggleForgotPassword = (event) => {
    event.preventDefault();
    this.setState((state) => ({
      forgotPassword: !state.forgotPassword,
      warningMsg: "",
    }));
  };

  // toggleRememberMe = event => {
  //   if(event.target.checked) {
  //     this.setState({ rememberMe: true });
  //   }
  //   else {
  //     this.setState({ rememberMe: false });
  //   }
  // }
  handleChange = (prop) => (event) => {
    this.setState({
      [prop]: event.target.value,
      successMsg: "",
      warningMsg: "",
    });
  };

  toggleShowPassword = (name) => {
    this.setState((state) => ({ [name]: !state[name] }));
  };

  isUserAuthenticated = async () => {
    this.setState({ isLoading: true, successMsg: "", warningMsg: "" });
    let isAuthenticated = false;
    try {
      console.log(
        "process.env.REACT_APP_USE_CUSTOM_LOGIN: ",
        process.env.REACT_APP_USE_CUSTOM_LOGIN,
      );

      let loginURI = "/service/login";
      if (process.env.REACT_APP_USE_CUSTOM_LOGIN == "true") {
        loginURI = "/custom/login";
      }
      let response = await api.post(loginURI, {
        userName: this.state.userName,
        password: this.state.password,
      });
      // console.log(`Login response: ${JSON.stringify(response)}`);

      // Get the sessionID from the response
      // const sessionID = response.headers.get("set-cookie");
      // // Log the sessionID to the console
      // console.log("sessionID: ", sessionID);

      if (response.data.tempPasswordFlag) {
        //enable "Change Password" form if the user is logging in with Temp password
        this.setState({
          tempPasswordFlag: true,
        });
      } else if (response.data.permissions) {
        console.log("response.data: ", response.data);
        const {
          setUserPermissions,
          setUserName,
          setUserId,
          setUserSessionLog,
          setUserTIN,
          setDisplayUserName,
        } = this.context;
        if (response?.data?.userSessionLog?.locationDefaults && !isBranchEnabled) {
          response.data.userSessionLog.locationDefaults.Branch = 1;
        }
        //Set user permissions to `context`
        setUserPermissions(response.data.permissions);
        setUserName(response.data.UserName);
        setUserId(response.data.InternalKey);
        setUserTIN(response.data.userSessionLog.UserTIN);
        setDisplayUserName(response.data.userSessionLog.displayUserName);
        setUserSessionLog(response.data.userSessionLog);

        console.log("Login Success!");
        localStorage.setItem("InternalKey", response.data.InternalKey);
        // localStorage.setItem("UserCode", response.data.UserCode);
        localStorage.setItem("UserName", response.data.UserName);
        localStorage.setItem("Name", this.state.userName);
        // localStorage.setItem("MobilePhoneNumber", response.data.MobilePhoneNumber);
        // localStorage.setItem("eMail", response.data.eMail);
        // localStorage.setItem("permissions", JSON.stringify(response.data.permissions));
        localStorage.setItem("loginTime", new Date());
        isAuthenticated = true;
        if (this.state.rememberMe) {
          localStorage.setItem("Name", this.state.userName);
        } else {
          localStorage.setItem("Name", "");
        }
      }
    } catch (error) {
      console.log("error.response.data: " + JSON.stringify(error?.response?.data));
      if (error.response) {
        this.setState({
          warningMsg: error?.response?.data?.message,
        });
      } else {
        this.setState({
          warningMsg: "Unable to connect to the server! Please contact your administrator",
        });
      }
      // localStorage.clear();
      clearLocalStorage();
    } finally {
      this.setState({ isLoading: false });
    }
    return isAuthenticated;
  };

  componentDidMount() {
    console.log("Login - didMount");
    //Set the error msg when the Session Times out
    if (this.props.location.state) {
      console.log("componentDidMount - Login: " + this.props.location.state.message);
      if (this.props.location.state.message) {
        this.setState({
          message: this.props.location.state.message,
          type: this.props.location.state.type,
        });

        //Reset the Status Code so that the user can login back by entring their credentials.
        //If this is not done the status would remain `401`, so Admin.js will redirect the user back to
        //Login when he enters the creds. after auto-logout
        const { setErrorStatusCode } = this.context;
        setErrorStatusCode("");
      }
    }
    // localStorage.clear();
    clearLocalStorage();
    this.checkUserLabel();

    // check if cookie enabled in browser
    // const isCookieEnabled = navigator.cookieEnabled;
    // console.log("isCookieEnabled: ", isCookieEnabled);
    // localStorage.setItem("Name", "");
  }

  checkUserLabel = () => {
    const username = localStorage.getItem("Name");
    if (username) {
      this.setState({ userLable: true, userName: username });
    } else {
      this.setState({ userLable: false });
    }
  };

  handleForgotPassword = async (event) => {
    this.setState({ isLoading: true, successMsg: "", warningMsg: "" });
    event.preventDefault();
    try {
      const response = await api.post("/custom/forgot-password", {
        userName: this.state.userName,
        mailId: this.state.mailId,
      });
      if (response.data) {
        this.setState({
          successMsg: response.data.message,
          forgotPassword: false,
          userName: "",
          password: "",
        });
      }
    } catch (error) {
      this.setState({ warningMsg: error.response.data.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  updatePassword = async (event) => {
    this.setState({ isLoading: true, successMsg: "", warningMsg: "" });
    event.preventDefault();
    console.log("updatePassword");
    let warningMsg;
    const { userName, password, newPassword1, newPassword2 } = this.state;
    console.log(
      `userName: ${userName} | password: ${password} | newPassword1: ${newPassword1} | newPassword2: ${newPassword1}`,
    );
    if (newPassword1 === "") warningMsg = "Enter the new password";
    else if (newPassword2 === "") warningMsg = "Retype the new password";
    else if (newPassword1 !== newPassword2)
      warningMsg = "New password did not match. Please try again";
    else {
      try {
        const response = await api.patch("/custom/update-password", {
          //internalKey: localStorage.getItem("InternalKey"),
          userName,
          password,
          newPassword: newPassword1,
          screen: "Login",
        });
        if (response.data) {
          if (response.data.permissions) {
            console.log("Login Success!");
            localStorage.setItem("InternalKey", response.data.InternalKey);
            // localStorage.setItem("UserCode", response.data.UserCode);
            localStorage.setItem("UserName", response.data.UserName);
            localStorage.setItem("MobilePhoneNumber", response.data.MobilePhoneNumber);
            localStorage.setItem("eMail", response.data.eMail);
            // localStorage.setItem("permissions", JSON.stringify(response.data.permissions));
            localStorage.setItem("loginTime", new Date());
            this.props.history.push("/u/dashboard");
          }
        } else if (response.status == "204") {
          warningMsg = "Unable to set password. Please try again";
        }
      } catch (error) {
        if (error.response.status == "401") warningMsg = "Invalid password. Please try again";
        else warningMsg = "Unable to update password-" + error;
      }
    }
    this.setState({
      isLoading: false,
      warningMsg,
    });
  };

  handleLogin = async (event) => {
    event.preventDefault();
    if (await this.isUserAuthenticated()) this.props.history.push("/u/dashboard");
    console.log("UserName: " + localStorage.getItem("UserName"));
  };

  showUserInput = () => {
    this.setState({ userLable: false });
    if (this.inputRef.current) {
      this.inputRef.current.focus(); // Ensure that inputRef is properly assigned
    }
  };

  render() {
    return (
      <>
        {/*<Col lg="5" md="7" className="mb--5 mt--5"> {/** pt--2 pb--6 didn't work. Didnt reduce the padding within the login form */}
        <Col lg="12" md="10">
          <Card className="bg-white shadow-xl border-0 mt-md-1 mt-sm-1">
            <CardBody className="px-lg-4 py-lg-5 pl-lg-5 pr-lg-5">
              <Row>
                <Col md="5" sm="12" className="pl-6 py-4">
                  {/* {process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ?
                <img alt="POS" width="320px" src={require("assets/img/brand/logo-full.png")} />
                :
                <img alt="POS" width="320px" src={require("assets/img/brand2/logo-full.png")} />
              } */}
                  {process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ? (
                    <img
                      alt="POS"
                      width="350px"
                      height="280px"
                      src={require("assets/img/brand/logos.jpg")}
                    />
                  ) : (
                    <img
                      alt="POS"
                      width="350px"
                      height="280px"
                      src={require("assets/img/brand2/logos.jpg")}
                    />
                  )}
                  {/* width="350px" height="186px" */}
                </Col>
                <Col md="1" sm="0">
                  <div
                    className="my-3"
                    style={{
                      borderRight: "1px solid #ced4da",
                      height: "250px",
                    }}
                  />
                </Col>
                <Col md="5" sm="9" className="ml-sm-6 ml-md-6">
                  {!this.state.forgotPassword && !this.state.tempPasswordFlag ? (
                    <>
                      <div className="text-center mb-5 pb-1 mt--3">
                        <h5 className="heading text-primary">Welcome</h5>
                        <small></small>
                      </div>
                      <Form role="form" onSubmit={this.handleLogin}>
                        {this.state.userLable ? (
                          <h4 className="mt-1">
                            <label className="user-label text-primary mr-1">Username:</label>
                            {this.state.userName}
                            <i
                              className="fa fa-pencil-alt mx-4s text-primary mx-3"
                              onClick={() => this.showUserInput()}
                            />
                          </h4>
                        ) : (
                          <FormGroup className="mb-5">
                            {" "}
                            {/* Increasing the no. mb-6 will increase the space bw this textbox & the below one */}
                            <InputGroup style={{ width: "90%" }} className="input-group">
                              {" "}
                              {/** input-group-alternative */}
                              <InputGroupAddon addonType="prepend">
                                <InputGroupText>
                                  <i className="ni ni-hat-3" />
                                </InputGroupText>
                              </InputGroupAddon>
                              <Input
                                id="username-input"
                                placeholder="Username"
                                type="userName"
                                autoComplete="new-username"
                                value={this.state.userName}
                                onChange={this.handleChange("userName")}
                                required={true}
                                ref={this.inputRef}
                              />
                            </InputGroup>
                          </FormGroup>
                        )}
                        <FormGroup>
                          <InputGroup className="input-group" style={{ width: "90%" }}>
                            <InputGroupAddon addonType="prepend">
                              <InputGroupText>
                                <i className="ni ni-lock-circle-open" />
                              </InputGroupText>
                            </InputGroupAddon>
                            <Input
                              placeholder="Password"
                              autoComplete="new-password"
                              type={this.state.showPassword ? "text" : "password"}
                              value={this.state.password}
                              onChange={this.handleChange("password")}
                              required={true}
                            />
                            <InputGroupAddon addonType="append">
                              <InputGroupText className="cursor-pointer">
                                {this.state.showPassword ? (
                                  <i
                                    className="fa fa-eye-slash"
                                    onClick={() => this.toggleShowPassword("showPassword")}
                                  />
                                ) : (
                                  <i
                                    className="fa fa-eye"
                                    onClick={() => this.toggleShowPassword("showPassword")}
                                  />
                                )}
                              </InputGroupText>
                            </InputGroupAddon>
                          </InputGroup>
                        </FormGroup>
                        <Row>
                          {/* <Col sm="5"
                      className="text-small custom-control custom-control-alternative custom-checkbox ml-5"
                    >
                    <input
                      className="custom-control-input"
                      id=" customCheckLogin"
                      type="checkbox"
                      checked={this.state.rememberMe}
                      onChange={this.toggleRememberMe}
                    />
                    <label
                      className="custom-control-label"
                      htmlFor=" customCheckLogin"
                    >
                      <span
                        style={{fontSize: "0.84rem"}}
                        className="text-muted"
                      >
                        Remember me
                      </span>
                    </label>
                    </Col> */}
                          <Col sm="5">
                            <a
                              className="text-primary text-medium"
                              href="#p"
                              onClick={(e) => this.toggleForgotPassword(e)}
                            >
                              <small>Forgot password?</small>
                            </a>
                          </Col>
                        </Row>
                        <div className="text-center mb--3">
                          {!this.state.isLoading ? (
                            <Button
                              className="my-4"
                              color="primary"
                              type="submit"
                              onClick={this.handleLogin}
                            >
                              Sign in
                            </Button>
                          ) : (
                            <span className="my-4 text-primary" style={{ fontSize: "15px" }}>
                              Logging in... &emsp;
                              <Spinner color="primary" className="reload-spinner" />
                            </span>
                          )}
                        </div>
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
                      </Form>
                    </>
                  ) : this.state.forgotPassword ? (
                    <>
                      <div className="text-center mb-4 mt--3">
                        <h6 className="heading-small text-muted">Forgot Password</h6>
                        <small></small>
                      </div>
                      <Form role="form" onSubmit={this.handleForgotPassword}>
                        <FormGroup className="mb-5">
                          {" "}
                          {/* Increasing the no. mb-6 will increase the space bw this textbox & the below one */}
                          <InputGroup className="input-group" style={{ width: "90%" }}>
                            <InputGroupAddon addonType="prepend">
                              <InputGroupText>
                                <i className="ni ni-hat-3" />
                              </InputGroupText>
                            </InputGroupAddon>
                            <Input
                              placeholder="Username"
                              type="userName"
                              autoComplete="new-username"
                              value={this.state.userName}
                              onChange={this.handleChange("userName")}
                              required={true}
                            />
                          </InputGroup>
                        </FormGroup>
                        <FormGroup>
                          <InputGroup className="input-group" style={{ width: "90%" }}>
                            <InputGroupAddon addonType="prepend">
                              <InputGroupText>
                                <i className="ni ni-email-83" />
                              </InputGroupText>
                            </InputGroupAddon>
                            <Input
                              placeholder="Enter your mail id"
                              autoComplete="mailId"
                              type="email"
                              value={this.state.mailId}
                              onChange={this.handleChange("mailId")}
                              required={true}
                            />
                          </InputGroup>
                        </FormGroup>
                        <Row>
                          <Col sm="6">
                            <a
                              className="text-primary"
                              href="#p"
                              onClick={(e) => this.toggleForgotPassword(e)}
                            >
                              <small>Back</small>
                            </a>
                          </Col>
                        </Row>
                        <div className="text-center mb--3">
                          {!this.state.isLoading ? (
                            <Button
                              className="my-4"
                              color="primary"
                              type="submit"
                              onClick={this.handleForgotPassword}
                            >
                              Submit
                            </Button>
                          ) : (
                            <span className="my-4 text-primary" style={{ fontSize: "15px" }}>
                              Processing... &emsp;
                              <Spinner color="primary" className="reload-spinner" />
                            </span>
                          )}
                        </div>
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
                      </Form>
                    </>
                  ) : this.state.tempPasswordFlag ? (
                    <>
                      <div className="text-center mb-4 mt--3">
                        <h6 className="heading-small text-muted">Change Password</h6>
                        <small></small>
                      </div>
                      <Form role="form" onSubmit={this.updatePassword}>
                        <FormGroup>
                          <InputGroup className="input-group" style={{ width: "90%" }}>
                            <InputGroupAddon addonType="prepend">
                              <InputGroupText>
                                <i className="ni ni-lock-circle-open" />
                              </InputGroupText>
                            </InputGroupAddon>
                            <Input
                              placeholder="New Password"
                              autoComplete="new-password1"
                              type={this.state.showPassword1 ? "text" : "password"}
                              value={this.state.newPassword1}
                              onChange={this.handleChange("newPassword1")}
                              required={true}
                            />
                            <InputGroupAddon addonType="append">
                              <InputGroupText className="cursor-pointer">
                                {this.state.showPassword1 ? (
                                  <i
                                    className="fa fa-eye-slash"
                                    onClick={() => this.toggleShowPassword("showPassword1")}
                                  />
                                ) : (
                                  <i
                                    className="fa fa-eye"
                                    onClick={() => this.toggleShowPassword("showPassword1")}
                                  />
                                )}
                              </InputGroupText>
                            </InputGroupAddon>
                          </InputGroup>
                        </FormGroup>
                        <FormGroup>
                          <InputGroup className="input-group" style={{ width: "90%" }}>
                            <InputGroupAddon addonType="prepend">
                              <InputGroupText>
                                <i className="ni ni-lock-circle-open" />
                              </InputGroupText>
                            </InputGroupAddon>
                            <Input
                              placeholder="Retype Password"
                              autoComplete="new-password2"
                              type={this.state.showPassword2 ? "text" : "password"}
                              value={this.state.newPassword2}
                              onChange={this.handleChange("newPassword2")}
                              required={true}
                            />
                          </InputGroup>
                        </FormGroup>
                        {/* <Row>
                      <Col sm="6">
                        <a
                          className="text-muted text-medium"
                          href="#p"
                          onClick={(e) => this.toggleForgotPassword(e)}
                        >
                          <small>Forgot password?</small>
                        </a>
                      </Col>
                    </Row> */}
                        <div className="text-center mb--3">
                          {!this.state.isLoading ? (
                            <Button
                              className="my-4"
                              color="primary"
                              type="submit"
                              onClick={this.updatePassword}
                            >
                              Submit
                            </Button>
                          ) : (
                            <span className="my-4 text-primary" style={{ fontSize: "15px" }}>
                              Logging in... &emsp;
                              <Spinner color="primary" className="reload-spinner" />
                            </span>
                          )}
                        </div>
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
                      </Form>
                    </>
                  ) : null}
                </Col>
              </Row>
            </CardBody>
          </Card>
          <Row className="text-center align-items-center justify-content-xl-between mt-3">
            <Col xl="6">
              <small className="copyright text-center text-muted">
                © {new Date().getFullYear()} &nbsp;
                <a
                  className="text-muted"
                  href={companyURL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {companyName}
                  <b></b>
                </a>
              </small>
            </Col>
            <Col xl="6">
              <a className="text-muted" href="#" rel="noopener noreferrer" target="_blank">
                {/* <i className="fa fa-cogs text-orange" /> &nbsp;
                <small>Powered by &nbsp;TNS<b></b></small> */}
              </a>
            </Col>
          </Row>
        </Col>
        {this.state.message && <ToastMessage type={this.state.type} message={this.state.message} />}
      </>
    );
  }
}

export default Login;
