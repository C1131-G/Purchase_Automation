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

import Header from "../../../components/Headers/Header";
import DeliveryList from "./DeliveryList";
import ItemDetails from "./ItemDetails";
import api from "../../../config/api-nodejs";
import { getDashboardTileSelection } from "../../../config/util";
import { portalModules, permissions, displayModes } from "../../../config/config";
import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";

const moduleName = portalModules.DELIVERY;

class Delivery extends React.PureComponent {
  static contextType = UserPermissionsContext;

  state = {
    wizardTab: getDashboardTileSelection().wizardTab,
    draftStatus: getDashboardTileSelection().draftStatus,
    selectedRecord: {},
    userRole: "",
    tabCursorStyle: ["", "", "not-allowed"],
    normalItemsList: [],
    createdBatchList: [],
    createdSerialNoList: [],
    isApprover: false,
    isOriginator: false,
    isLoading: false,
  };

  //this will be excuted only when Tab#1 is clicked
  toggleTabs = (e, tab) => {
    this.clearDashboardTileSelection();

    e.preventDefault();
    let tabCursorStyle = [];
    if (tab === 1 || tab === 2) tabCursorStyle = ["", "", "not-allowed"];
    else if (tab === 3) tabCursorStyle = ["pointer", "pointer", "default"];
    else if (tab === 4) tabCursorStyle = ["pointer", "pointer", "pointer"];

    this.setState({
      wizardTab: tab,
      tabCursorStyle,
    });
  };

  /**
   * Check if the current user is an Approver or Originator, based on this
   * recs. will be shown
   */
  approverOriginatorCheck = async () => {
    this.setState({ isLoading: true });
    let isApprover = false,
      isOriginator = false,
      wizardTab = 1;

    try {
      const response = await api.get("/custom/count", {
        params: { moduleName, userId: localStorage.getItem("InternalKey") },
      });
      console.log("approverOriginatorCheck - response.data: " + response.data.isApprover);
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

  /** Callback function to be executed from child component <DeliveryList> component.
   * Passes the selected rec. from child component to this component- DeliveryList.
   * This object will be passed to <EditPopup> as props.
   * @param {String} operation    "edit" or "create"
   * @param {Object} selectedRecord Rec. that is selected for "edit" opertion.
   *                              This value will be blank {} when the operation is "create"
   */
  setSelectedRecordDetails = (operation, selectedRecord, tab, userRole) => {
    console.log(`index - userRole: ${userRole} | tab: ${tab}`);
    let tabCursorStyle = [];
    if (tab === 1 || tab === 2) tabCursorStyle = ["", "", "not-allowed"];
    else if (tab === 3) tabCursorStyle = ["pointer", "pointer", "default"];
    else if (tab === 4) tabCursorStyle = ["pointer", "pointer", "pointer"];

    this.setState({
      userRole,
      operation,
      selectedRecord,
      wizardTab: tab,
      tabCursorStyle,
      successMsg: "",
      warningMsg: "",
    });
  };

  /*componentDidUpdate (prevProps, prevState) {
    console.log("Delivery - index - componentDidUpdate: "+this.props.draftStatus);
    if (this.state.draftStatus && !prevState.draftStatus) {
      this.setDashboardTileSelection();
    }
  }*/

  /**
   * Clears the Dashboard Tile seletion ('status' filter & 'tab' selection) from session & state
   */
  clearDashboardTileSelection = () => {
    sessionStorage.setItem("SELECTED_DASHBOARD_TILE", "");
    this.setState({ draftStatus: "ALL" });
  };

  componentWillUnmount = () => {
    this.clearDashboardTileSelection();
  };

  componentDidMount = async () => {
    console.log("Delivery - index - componentDidMount");
    // this.setDashboardTileSelection();
    await this.approverOriginatorCheck();
    // this.setState({ draftStatus: this.getStatusFromQueryString() });
  };

  render() {
    const { checkUserPermission } = this.context;
    const hasCreatePermission = checkUserPermission(moduleName, permissions.CREATE);
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
                      {hasCreatePermission && (
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
                            Deliveries
                          </NavLink>
                        </NavItem>
                      )}
                      {/** Visible only for Approvers */}
                      {hasCreatePermission && this.state.isApprover && (
                        <NavItem>
                          <NavLink
                            aria-selected={this.state.wizardTab === 2}
                            className={classnames("mb-sm-3 mb-md-0", {
                              active: this.state.wizardTab === 2,
                            })}
                            onClick={(e) => this.toggleTabs(e, 2)}
                            href="#"
                            role="tab"
                            style={{ cursor: this.state.tabCursorStyle[1] }}
                          >
                            <i className="fa fa-address-card mr-2" /> {/** fa-cog rocket */}
                            Awaiting Approval
                          </NavLink>
                        </NavItem>
                      )}
                      {hasCreatePermission && (
                        <NavItem>
                          <NavLink
                            aria-selected={this.state.wizardTab === 3}
                            className={classnames("mb-sm-3 mb-md-0", {
                              active: this.state.wizardTab === 3,
                            })}
                            //onClick={e => this.toggleTabs(e, 3)}
                            //Enable onClick only when the current tab is the 4th one
                            onClick={
                              this.state.wizardTab === 4 ? (e) => this.toggleTabs(e, 3) : undefined
                            }
                            href="#"
                            role="tab"
                            style={{ cursor: this.state.tabCursorStyle[2] }}
                          >
                            <i className="fa fa-address-card mr-2" /> {/** fa-cog rocket */}
                            Item Details
                          </NavLink>
                        </NavItem>
                      )}
                    </Nav>
                  </div>
                </CardBody>

                {/**<Card className="shadow">
              <CardBody>*/}
                <TabContent activeTab={"wizardTab" + this.state.wizardTab}>
                  {hasCreatePermission && this.state.wizardTab === 1 && (
                    <TabPane tabId="wizardTab1">
                      <DeliveryList
                        userRole="ORIGINATOR"
                        prevTab={1}
                        setSelectedRecordDetails={this.setSelectedRecordDetails}
                        draftStatus={this.state.draftStatus}
                      />
                    </TabPane>
                  )}
                  {/** Tab#2 */}
                  {hasCreatePermission && this.state.isApprover && this.state.wizardTab === 2 && (
                    <TabPane tabId="wizardTab2">
                      <DeliveryList
                        userRole="APPROVER"
                        prevTab={2}
                        setSelectedRecordDetails={this.setSelectedRecordDetails}
                        draftStatus={this.state.draftStatus}
                      />
                    </TabPane>
                  )}
                  {hasCreatePermission && this.state.wizardTab === 3 && (
                    <TabPane tabId="wizardTab3">
                      <ItemDetails
                        operation={displayModes.VIEW}
                        userRole={this.state.userRole}
                        selectedRecord={this.state.selectedRecord}
                        //setSelectedRecordDetails={this.setSelectedRecordDetails}
                      />
                    </TabPane>
                  )}
                  {!hasCreatePermission && (
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

export default Delivery;
