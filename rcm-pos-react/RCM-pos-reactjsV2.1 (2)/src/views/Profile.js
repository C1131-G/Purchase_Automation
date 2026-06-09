import React from "react";

// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Form,
  Input,
  Container,
  Row,
  Col,
  Spinner,
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import api from "../config/api-nodejs";
import { showWarningMsg } from "../config/util.js";
import { companyNames } from "../config/config.js";

class Profile extends React.Component {
  state = {
    oldPassword: "",
    newPassword1: "",
    newPassword2: "",
    isLoading: false,
    warningMsg: "",
  };

  handleChange = (name, event) => {
    this.setState({ [name]: event.target.value });
  };

  updatePassword = async (event) => {
    this.setState({ isLoading: true, warningMsg: "" });
    event.preventDefault();
    console.log("updatePassword");
    let warningMsg;
    const { oldPassword, newPassword1, newPassword2 } = this.state;
    if (oldPassword === "") warningMsg = "Enter your current password";
    else if (newPassword1 === "") warningMsg = "Enter the new password";
    else if (newPassword2 === "") warningMsg = "Retype the new password";
    else if (newPassword1 !== newPassword2)
      warningMsg = "New password did not match. Please try again";
    else {
      try {
        const response = await api.patch("/custom/update-password", {
          //internalKey: localStorage.getItem("InternalKey"),
          userName: localStorage.getItem("UserName"),
          password: oldPassword,
          newPassword: newPassword1,
        });
        if (response.data.message) {
          console.log("Password has been updated successfully!");
          this.setState({
            successMsg: response.data.message,
            oldPassword: "",
            newPassword1: "",
            newPassword2: "",
          });
        } else if (response.status == "204") {
          warningMsg = "Invalid password. Please try again";
        }
      } catch (error) {
        if (error.response.data.message) warningMsg = error.response.data.message;
        else warningMsg = "Invalid password. Please try again";
      }
    }
    this.setState({
      isLoading: false,
      warningMsg,
    });
  };

  render() {
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt-2 pt-2" fluid>
          <Row>
            <Col className="order-xl-2 mb-5 mb-xl-0" xl="4">
              <Card className="card-profile shadow">
                <Row className="justify-content-center">
                  <Col className="order-lg-2" lg="3">
                    <div className="card-profile-image">
                      <a href="#brand" onClick={(e) => e.preventDefault()}>
                        {process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ? (
                          <img
                            alt="..."
                            className="image-md"
                            src={require("assets/img/brand/logo.png")}
                          />
                        ) : (
                          <img
                            alt="..."
                            className="image-md"
                            src={require("assets/img/brand2/logo.png")}
                          />
                        )}
                      </a>
                    </div>
                  </Col>
                </Row>
                <CardHeader className="text-center border-0 pt-8 pt-md-4 pb-0 pb-md-4"></CardHeader>
                <CardBody className="pt-0 pt-md-4">
                  <Row>
                    <div className="card-profile-stats d-flex justify-content-center mt-md-5"></div>
                  </Row>
                  <div className="text-center">
                    <h3>Username: &nbsp;{localStorage.getItem("UserName")}</h3>
                    <div className="h5 mt-3">
                      <i className="ni location_pin mr-2" />
                      UserCode: &nbsp;{localStorage.getItem("UserCode")}
                    </div>
                    <hr className="my-4" />
                    <div className="h5 mt-4">
                      <i className="ni business_briefcase-24 mr-2" />
                      Mail: &nbsp;{localStorage.getItem("eMail")}
                    </div>
                    <div className="h5 mt-3">
                      <i className="ni education_hat mr-2" />
                      Phone: &nbsp; {localStorage.getItem("MobilePhoneNumber")}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col className="order-xl-1" xl="8">
              <Card className="bg-secondary shadow">
                <CardHeader className="bg-white border-1">
                  <Row className="align-items-center">
                    <Col xs="4">
                      <h3 className="mb-0">My account</h3>
                    </Col>
                    <Col className="text-right" xs="8">
                      {this.state.successMsg ? (
                        <span className="text-success mr-20 small">
                          <i className="fa fa-info-circle" /> &nbsp;
                          {this.state.successMsg}
                        </span>
                      ) : this.state.warningMsg ? (
                        showWarningMsg(this.state.warningMsg)
                      ) : null}
                      &emsp;
                      {this.state.isLoading ? (
                        <Spinner color="primary" className="reload-spinner" />
                      ) : (
                        <Button
                          color="primary"
                          href="#pablo"
                          onClick={this.updatePassword}
                          size="sm"
                          type="submit"
                        >
                          Update
                        </Button>
                      )}
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody>
                  <h6 className="heading-small text-muted mb-4">User information</h6>
                  <div className="pl-lg-4">
                    <Form role="form" onSubmit={this.updatePassword}>
                      <Row>
                        <Col lg="6">
                          <FormGroup>
                            <label className="form-control-label" htmlFor="input-old-password">
                              Current Password
                            </label>
                            <Input
                              className="form-control-alternative"
                              id="input-old-password"
                              placeholder="Current Password"
                              type="password"
                              value={this.state.oldPassword}
                              onChange={(e) => this.handleChange("oldPassword", e)}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col lg="6">
                          <FormGroup>
                            <label className="form-control-label" htmlFor="input-new-password">
                              New Password
                            </label>
                            <Input
                              className="form-control-alternative"
                              id="input-new-password"
                              placeholder="New Password"
                              type="password"
                              value={this.state.newPassword1}
                              onChange={(e) => this.handleChange("newPassword1", e)}
                            />
                          </FormGroup>
                        </Col>
                        <Col lg="6">
                          <FormGroup>
                            <label className="form-control-label" htmlFor="input-new-password2">
                              Retype Password
                            </label>
                            <Input
                              className="form-control-alternative"
                              id="input-new-password2"
                              placeholder="Retype Password"
                              type="password"
                              value={this.state.newPassword2}
                              onChange={(e) => this.handleChange("newPassword2", e)}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </Form>
                  </div>
                  {/*<hr className="my-4" /> */}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default Profile;
