import React from "react";
import classnames from "classnames";
// reactstrap components
import {
  Card,
  CardBody,
  NavItem,
  NavLink,
  Nav,
  TabContent,
  TabPane,
  Container,
  Row,
  Col,
  Spinner,
} from "reactstrap";

import Header from "../../components/Headers/Header";
import RequestList from "./RequestList";
import RequestDetails from "./RequestDetails";
import api from "../../config/api-nodejs";
import { portalModules, permissions } from "../../config/config";
import { UserPermissionsContext } from "../../contexts/UserPermissionsContext";

const moduleName = portalModules.APPROVAL_STATUS_REPORT;

class Reports extends React.Component {
  static contextType = UserPermissionsContext;

  state = {
    moduleName: "",
    wizardTab: 1,
    draftStatus: "ALL",
    selectedRecord: {},
    userRole: "",
    tabCursorStyle: ["", "not-allowed"],
    isApprover: false,
    isOriginator: false,
    isLoading: false,
  };

  //this will be excuted only when Tab#1 is clicked
  toggleTabs = (e, tab) => {
    e.preventDefault();
    let tabCursorStyle = [];
    if (tab === 1) tabCursorStyle = ["", "not-allowed"];
    else if (tab === 2) tabCursorStyle = ["pointer", "pointer"];

    this.setState({
      wizardTab: tab,
      tabCursorStyle,
    });
  };

  /**
   * Check if the current user is an Approver or Originator, based on this
   * STR will be shown
   */
  approverOriginatorCheck = async () => {
    this.setState({ isLoading: true });
    let isApprover = false,
      isOriginator = false,
      wizardTab = 1;

    try {
      const response = await api.get("/custom/count", {
        params: { moduleName, userId: localStorage.getItem("InternalKey") },
      }); //APPROVAL_STATUS_REPORT
      console.log("response.data: " + response.data.isApprover);
      if (response.data) {
        if (response.data.isApprover) isApprover = true;
        // if (response.data.isOriginator)
        //   isOriginator = true;
      }
      // if(isOriginator)
      //   wizardTab = 1;
      // else if (isApprover && !isOriginator)
      //   wizardTab = 2;

      this.setState({
        isApprover,
        // isOriginator,
        // wizardTab
      });
    } catch (err) {
      if (err.response) this.setState({ warningMsg: err.response.data.message });
      else if (err.message) this.setState({ warningMsg: err.message });
      else this.setState({ warningMsg: JSON.stringify(err) });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /** Callback function to be executed from child component <GRPODraftList> component.
   * Passes the selected GRPODraft object from child component to this component- RequestList.
   * This object will be passed to <EditPopup> as props.
   * @param {String} operation    " edit" or "create"
   * @param {Object} selectedRecord GRPODraft object that is selected for "edit" opertion.
   *                                This value will be blank {} when the operation is "create"
   * @param {Number} tab            Target tab#
   * @param {String} moduleName     Name of the module selected in the filter. Based on this
   *                                API URI is chosen in the <RequestDetails> comp.
   */
  setRecordDetails = (operation, selectedRecord, tab, userRole, moduleName) => {
    console.log(`Report index - moduleName: ${moduleName} | tab: ${tab}`);
    let tabCursorStyle = [];
    if (tab === 1) tabCursorStyle = ["", "not-allowed"];
    else if (tab === 2) tabCursorStyle = ["pointer", "pointer"];

    this.setState({
      moduleName,
      userRole,
      operation,
      selectedRecord,
      wizardTab: tab,
      tabCursorStyle,
      successMsg: "",
      warningMsg: "",
    });
  };

  componentDidMount = async () => {
    //console.log("componentDidMount - draftStatus: "+ this.getStatusFromQueryString());
    await this.approverOriginatorCheck();
    // this.setState({
    //   draftStatus: this.getStatusFromQueryString()
    // });
  };

  render() {
    const { checkUserPermission } = this.context;
    const hasReadPermission = checkUserPermission(moduleName, permissions.READ);
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt-3" fluid>
          {/** Tabs */}
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-white shadow">
                <CardBody className="mt--3 mb--4 donot-printme">
                  <div className="nav-wrapper">
                    <Nav
                      className="nav-fill flex-column flex-md-row"
                      id="tabs-icons-text"
                      pills
                      role="tablist"
                    >
                      {hasReadPermission && (
                        <NavItem>
                          <NavLink
                            aria-selected={this.state.wizardTab === 1}
                            className={classnames("mb-sm-3 mb-md-0", {
                              active: this.state.wizardTab === 1,
                            })}
                            onClick={(e) => this.toggleTabs(e, 1)}
                            href="#"
                            role="tab"
                            style={{ cursor: this.state.tabCursorStyle[0] }}
                          >
                            <i className="fa fa-address-card mr-2" /> {/** fa-server tasks */}
                            Approval Status Report
                          </NavLink>
                        </NavItem>
                      )}
                      {/** Visible only for Approvers */}
                      {hasReadPermission && (
                        // this.state.isApprover &&
                        <NavItem>
                          <NavLink
                            aria-selected={this.state.wizardTab === 2}
                            className={classnames("mb-sm-3 mb-md-0", {
                              active: this.state.wizardTab === 2,
                            })}
                            // onClick={e => this.toggleTabs(e, 2)}
                            href="#"
                            role="tab"
                            style={{ cursor: this.state.tabCursorStyle[1] }}
                          >
                            <i className="fa fa-address-card mr-2" /> {/** fa-cog rocket */}
                            Request Details
                          </NavLink>
                        </NavItem>
                      )}
                    </Nav>
                  </div>
                </CardBody>

                {/**<Card className="shadow">
              <CardBody>*/}
                <TabContent activeTab={"wizardTab" + this.state.wizardTab}>
                  {hasReadPermission && this.state.wizardTab === 1 && (
                    <TabPane tabId="wizardTab1">
                      <RequestList
                        userRole="ORIGINATOR"
                        prevTab={1}
                        setRecordDetails={this.setRecordDetails}
                        draftStatus={this.state.draftStatus}
                      />
                    </TabPane>
                  )}
                  {/** Tab#2 */}
                  {hasReadPermission && this.state.wizardTab === 2 && (
                    <TabPane tabId="wizardTab2">
                      <RequestDetails
                        operation={this.state.operation}
                        userRole={this.state.userRole}
                        selectedRecord={this.state.selectedRecord}
                        moduleName={this.state.moduleName}
                      />
                    </TabPane>
                  )}
                  {!hasReadPermission && (
                    <h4 className="mb-4 pb-2 text-center text-warning">
                      You don't have authorization to access this content!
                    </h4>
                  )}
                </TabContent>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default Reports;
