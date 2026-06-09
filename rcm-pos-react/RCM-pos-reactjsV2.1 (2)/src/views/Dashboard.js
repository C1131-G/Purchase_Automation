import React, { Suspense } from "react";
import { Link } from "react-router-dom";
// node.js library that concatenates classes (strings)
import classnames from "classnames";
// reactstrap components
import { Card, CardHeader, CardBody, CardTitle, Container, Row, Col, Spinner } from "reactstrap";
import { ChevronsRight, Trash2, Circle, Sun, Loader } from "react-feather";

import Header from "../components/Headers/Header";
import api from "../config/api-nodejs";
import {
  portalModules,
  apiURIs,
  permissions,
  draftStatus as draftStatusList,
} from "../config/config";
import { UserPermissionsContext } from "../contexts/UserPermissionsContext";

class Dashboard extends React.Component {
  static contextType = UserPermissionsContext;

  state = {
    isApprover: false,
    isOriginator: false,
    originatorPending: 0,
    originatorApproved: 0,
    originatorRejected: 0,
    approverPending: 0,
    approverApproved: 0,
    approverRejected: 0,
    isLoading: false,
    successMsg: "",
    warningMsg: "",
  };

  /**
   * Takes the user to the appropriate 'tab' in the selected screen
   * @param {*} url     Screen url
   * @param {*} status  Status to filter the records on the selected tab
   * @param {*} tab     Tab#
   */
  handleNavigation = (url, status, tab) => {
    this.props.history.push(`/u/${url}`);
    //directly storing Objects in Session or LocalStorage will not work
    sessionStorage.setItem("SELECTED_DASHBOARD_TILE", JSON.stringify({ status, tab }));
  };

  /**
   * Check if the current user is an Approver or Originator and get the Draft count for each status
   * (PENDING, APPROVED, REJECTED)
   */
  getRequestCount = async () => {
    this.setState({ isLoading: true });

    //NOTE: To add a Module to the Dashboard add the module details to the below array
    // - 'url' is from routes.js
    let modulesList = [
      {
        name: portalModules.STOCK_TRANSFER_REQUEST,
        label: portalModules.STOCK_TRANSFER_REQUEST,
        url: "stock-trans-request",
      },
      // {name: portalModules.STOCK_TRANSFER, label: portalModules.STOCK_TRANSFER, url: "stock-transfer"}
    ];
    let requestCountInfo = [],
      response;
    try {
      for (let i = 0; i < modulesList.length; i++) {
        response = {};
        response = await api.get("/custom/count", {
          params: { moduleName: modulesList[i].name, userId: localStorage.getItem("InternalKey") },
        });
        // console.log(modulesList[i].name +" - response.data: "+ JSON.stringify(response.data));
        if (response.data) {
          requestCountInfo.push({
            moduleName: modulesList[i].name,
            label: modulesList[i].label,
            url: modulesList[i].url,
            countInfo: {
              //Below two flags DOESN't seem to be used anywhere
              // isApprover: response.data.isApprover,
              // isOriginator: response.data.isOriginator,

              approverPending: response.data.approverPending,
              approverApproved: response.data.approverApproved,
              approverRejected: response.data.approverRejected,
              originatorPending: response.data.originatorPending,
              originatorApproved: response.data.originatorApproved,
              originatorRejected: response.data.originatorRejected,
            },
          });
          // localStorage.setItem("isApprover", response.data.isApprover);
          // localStorage.setItem("isOriginator", response.data.isOriginator);
        }
      }
      console.log("requestCountInfo: " + JSON.stringify(requestCountInfo));
      this.setState({ requestCountInfo });
    } catch (err) {
      if (err.response) this.setState({ warningMsg: err.response.data.message });
      else if (err.message) this.setState({ warningMsg: err.message });
      else this.setState({ warningMsg: JSON.stringify(err) });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  async componentDidMount() {
    console.log("Dashboard - componentDidMount");
    // this.getRequestCount();
  }

  render() {
    const { checkUserPermission } = this.context;
    const { requestCountInfo } = this.state;
    // console.log("requestCountInfo: "+ JSON.stringify(requestCountInfo));
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt-3" fluid>
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-white shadow">
                <CardBody className="mt--2 mb--3">
                  {" "}
                  {/** shadow */}
                  <>
                    <Row className="mt--2">
                      <Col className="text-right" md="5">
                        <div className="mb-0 mt--2">
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
                            <>
                              <small className="my-2 text-primary">Loading... &emsp;</small>
                              <Spinner color="primary" className="reload-spinner" />
                            </>
                          )}
                        </div>
                      </Col>
                    </Row>
                    {/** Awaiting Approval */}
                    {Array.isArray(requestCountInfo) && requestCountInfo.length > 0
                      ? requestCountInfo.map((request) => {
                          return checkUserPermission(request.moduleName, permissions.CREATE) &&
                            request.countInfo.isApprover ? (
                            <div key={request.moduleName + "_Approver"}>
                              <Row className="mt-1">
                                <Col sm="7">
                                  <h6 className="heading-small text-muted mb-3">
                                    {request.label} Awaiting your Approval
                                  </h6>
                                </Col>
                              </Row>
                              <Row
                                className="mb-4"
                                style={{
                                  display: "flex",
                                  alignContent: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Col sm="6" md="4" xl="3" className="mx-3">
                                  {" "}
                                  {/** xl="4" */}
                                  <Card className="mb-4 mb-xl-0 shadow-xl">
                                    {" "}
                                    {/** card-stats  */}
                                    <CardBody>
                                      <Row>
                                        <div className="col">
                                          <CardTitle
                                            tag="h5"
                                            className="text-uppercase text-muted mb-0"
                                          >
                                            Pending
                                          </CardTitle>
                                          <span className="h1 font-weight-bold mb-0">
                                            {request.countInfo.approverPending}
                                          </span>
                                        </div>
                                        <Col className="col-auto">
                                          <div className="icon icon-shape bg-yellow text-white rounded-circle shadow">
                                            <i className="fas fa-chart-bar" />
                                          </div>
                                        </Col>
                                      </Row>
                                      <p className="mt-3 mb-0 text-muted text-sm">
                                        {/* <span className="text-success mr-2">
                                    <i className="fa fa-arrow-up" /> 3.48%
                                  </span>{" "} */}
                                        <span className="text-nowrap">Pending with you</span>
                                        {/* <Link
                                    to={`/u/${request.url}?st=pending&t=2`}
                                    className="bold text-yellow text-sm text-underline float-right"
                                  >Click to view</Link> */}
                                        <span
                                          onClick={() =>
                                            this.handleNavigation(
                                              request.url,
                                              draftStatusList.PENDING,
                                              2,
                                            )
                                          }
                                          className="bold text-yellow text-sm text-underline float-right cursor-pointer"
                                        >
                                          Click to view
                                        </span>
                                      </p>
                                    </CardBody>
                                  </Card>
                                </Col>
                                <Col sm="6" md="4" xl="3" className="mx-3">
                                  {" "}
                                  {/** xl="4" */}
                                  <Card className="mb-4 mb-xl-0 shadow-xl">
                                    <CardBody>
                                      <Row>
                                        <div className="col">
                                          <CardTitle
                                            tag="h5"
                                            className="text-uppercase text-muted mb-0"
                                          >
                                            Approved
                                          </CardTitle>
                                          <span className="h1 font-weight-bold mb-0">
                                            {request.countInfo.approverApproved}
                                          </span>
                                        </div>
                                        <Col className="col-auto">
                                          <div
                                            className={
                                              "icon icon-shape text-white rounded-circle shadow" +
                                              " bg-success"
                                            }
                                          >
                                            <i className="fas fa-chart-bar" />
                                            {/* <i className="fas fa-chart-pie" /> */}
                                          </div>
                                        </Col>
                                      </Row>
                                      <p className="mt-3 mb-0 text-muted text-sm">
                                        <span className="text-nowrap">Approved by you</span>
                                        {/* <Link
                                    to={`/u/${request.url}?st=approved&t=2`}
                                    className="bold text-success text-sm text-underline float-right"
                                  >Click to view</Link> */}
                                        <span
                                          onClick={() =>
                                            this.handleNavigation(
                                              request.url,
                                              draftStatusList.APPROVED,
                                              2,
                                            )
                                          }
                                          className="bold text-success text-sm text-underline float-right cursor-pointer"
                                        >
                                          Click to view
                                        </span>
                                      </p>
                                    </CardBody>
                                  </Card>
                                </Col>
                                <Col sm="6" md="4" xl="3" className="mx-3">
                                  {" "}
                                  {/** xl="4" */}
                                  <Card className="mb-4 mb-xl-0 shadow-xl">
                                    <CardBody>
                                      <Row>
                                        <div className="col">
                                          <CardTitle
                                            tag="h5"
                                            className="text-uppercase text-muted mb-0"
                                          >
                                            Rejected
                                          </CardTitle>
                                          <span className="h1 font-weight-bold mb-0">
                                            {request.countInfo.approverRejected}
                                          </span>
                                        </div>
                                        <Col className="col-auto">
                                          <div className="icon icon-shape bg-danger text-white rounded-circle shadow">
                                            <i className="fas fa-chart-bar" />
                                            {/* <i className="fas fa-chart-pie" /> */}
                                          </div>
                                        </Col>
                                      </Row>
                                      <p className="mt-3 mb-0 text-muted text-sm">
                                        <span className="text-nowrap">Rejected by you</span>
                                        <span
                                          onClick={() =>
                                            this.handleNavigation(
                                              request.url,
                                              draftStatusList.REJECTED,
                                              2,
                                            )
                                          }
                                          className="bold text-danger text-sm text-underline float-right cursor-pointer"
                                        >
                                          Click to view
                                        </span>
                                      </p>
                                    </CardBody>
                                  </Card>
                                </Col>
                              </Row>
                            </div>
                          ) : null;
                        })
                      : null}
                    <Row>
                      {/** Originator Counts */}
                      {Array.isArray(requestCountInfo) && requestCountInfo.length > 0
                        ? requestCountInfo.map((request) => {
                            return (
                              // request.countInfo.isOriginator ?
                              checkUserPermission(request.moduleName, permissions.CREATE) ? (
                                <Col key={request.moduleName + "_Originator"}>
                                  <Row className="mt-0">
                                    <Col sm="12">
                                      <h6 className="heading-small text-muted mb-3">
                                        {request.label} submitted by you
                                      </h6>
                                    </Col>
                                  </Row>
                                  <Row
                                    className="mb-3"
                                    //to align the tiles horizontally center within each Row
                                    //this worked but not looking good!
                                    // style={{display: "flex", alignContent: "center", justifyContent: "center"}}
                                  >
                                    {/* <Col sm="6" md="4" xl="3" className="mx-3">
                            <Card className="mb-4 mb-xl-0 shadow-xl">
                              <CardBody>
                                <Row>
                                  <div className="col text-left">
                                    <CardTitle
                                      tag="h5"
                                      className="text-uppercase text-muted mb-0"
                                    >
                                      Pending
                                    </CardTitle>
                                    <span className="h1 font-weight-bold mb-0">
                                      {request.countInfo.originatorPending}
                                    </span>
                                  </div>
                                  <Col className="col-auto">
                                    <div className="icon icon-shape bg-yellow text-white rounded-circle shadow">
                                      <i className="fas fa-chart-bar" />
                                    </div>
                                  </Col>
                                </Row>
                                <p className="mt-0 mb-0 text-muted text-sm">
                                  <span
                                    onClick={() => this.handleNavigation(request.url, draftStatusList.PENDING, 1)}
                                    className="bold text-yellow text-sm text-underline float-right cursor-pointer"
                                  >Click to view</span>
                                </p>
                              </CardBody>
                            </Card>
                          </Col> */}
                                    <Col sm="4">
                                      {" "}
                                      {/** xl="4" */}
                                      <Card className="mb-4 mb-xl-0 shadow-xl">
                                        <CardBody>
                                          <Row>
                                            <div className="col text-left">
                                              {/* <CardTitle
                                      tag="h5"
                                      className="text-uppercase text-muted mb-0"
                                    >
                                      Approved
                                    </CardTitle> */}
                                              <span className="h1 font-weight-bold mb-0 display-3">
                                                {request.countInfo.originatorApproved}
                                              </span>
                                            </div>
                                            <Col className="col-auto">
                                              <div className="icon icon-shape bg-success text-white rounded-circle shadow">
                                                <i className="fas fa-chart-bar" />
                                                {/* <i className="fas fa-chart-pie" /> */}
                                              </div>
                                            </Col>
                                          </Row>
                                          <p className="mt-0 mb-0 text-muted text-sm">
                                            {" "}
                                            {/** mt-3 */}
                                            {/* <span className="text-nowrap">Approved by your Approver</span> */}
                                            <span
                                              onClick={() =>
                                                this.handleNavigation(
                                                  request.url,
                                                  draftStatusList.AUTO_APPROVED,
                                                  1,
                                                )
                                              }
                                              className="bold text-success text-sm text-underline float-right cursor-pointer"
                                            >
                                              Click to view
                                            </span>
                                          </p>
                                        </CardBody>
                                      </Card>
                                    </Col>
                                    {/* <Col sm="6" md="4" xl="3" className="mx-3">
                            <Card className="mb-4 mb-xl-0 shadow-xl">
                              <CardBody>
                                <Row>
                                  <div className="col text-left">
                                    <CardTitle
                                      tag="h5"
                                      className="text-uppercase text-muted mb-0"
                                    >
                                      Rejected
                                    </CardTitle>
                                    <span className="h1 font-weight-bold mb-0">
                                    {request.countInfo.originatorRejected}
                                    </span>
                                  </div>
                                  <Col className="col-auto">
                                    <div className="icon icon-shape bg-danger text-white rounded-circle shadow">
                                      <i className="fas fa-chart-bar" />
                                    </div>
                                  </Col>
                                </Row>
                                <p className="mt-0 mb-0 text-muted text-sm">
                                  <span
                                    onClick={() => this.handleNavigation(request.url, draftStatusList.REJECTED, 1)}
                                    className="bold text-danger text-sm text-underline float-right cursor-pointer"
                                  >Click to view</span>
                                </p>
                              </CardBody>
                            </Card>
                          </Col> */}
                                  </Row>
                                </Col>
                              ) : null
                            );
                          })
                        : !this.state.isLoading && <h4 className="mt-4">Dashboard</h4>}
                    </Row>
                  </>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default Dashboard;
