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
import StockTransferRequestList from "./StockTransferRequestList";
import StockTransferRequestDetails from "./StockTransferRequestDetails";
import api from "../../config/api-nodejs";
import { getDashboardTileSelection } from "../../config/util";
import { portalModules, permissions } from "../../config/config";
import { UserPermissionsContext } from "../../contexts/UserPermissionsContext";

const moduleName = portalModules.STOCK_TRANSFER_REQUEST;

class StockTransferRequests extends React.Component {
  static contextType = UserPermissionsContext;

  state = {
    wizardTab: getDashboardTileSelection().wizardTab,
    draftStatus: getDashboardTileSelection().draftStatus,
    selectedStockTransReq: {},
    userRole: "",
    tabCursorStyle: ["", "", "not-allowed", "not-allowed"],
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
    if (tab === 1 || tab === 2) tabCursorStyle = ["", "", "not-allowed", "not-allowed"];
    else if (tab === 3) tabCursorStyle = ["pointer", "pointer", "default", "not-allowed"];
    else if (tab === 4) tabCursorStyle = ["pointer", "pointer", "not-allowed", "default"];

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
      }); //STOCK_TRANSFER_REQUEST
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
   * Passes the selected GRPODraft object from child component to this component- StockTransferRequestList.
   * This object will be passed to <EditPopup> as props.
   * @param {String} operation    "edit" or "create"
   * @param {Object} selectedStockTransReq GRPODraft object that is selected for "edit" opertion.
   *                              This value will be blank {} when the operation is "create"
   */
  setGRPODraftDetails = (
    operation,
    selectedStockTransReq,
    tab,
    userRole,
    selectedProductionOrder,
  ) => {
    console.log(`GRPODrafts index - userRole: ${userRole} | tab: ${tab}`);
    let tabCursorStyle = [];
    if (tab === 1 || tab === 2) tabCursorStyle = ["", "", "not-allowed", "not-allowed"];
    else if (tab === 3) tabCursorStyle = ["pointer", "pointer", "default", "not-allowed"];
    else if (tab === 4) tabCursorStyle = ["pointer", "pointer", "not-allowed", "default"];

    this.setState({
      userRole,
      operation,
      selectedStockTransReq,
      selectedProductionOrder,
      wizardTab: tab,
      tabCursorStyle,
      successMsg: "",
      warningMsg: "",
    });
  };

  /** Callback function to be executed from child component <StockTransferRequestDetails> component.
   * These values are then passed to <QRCodes> comp.
   */
  setQRCodeDetails = (tab, grpoNum, normalItemsList, createdBatchList, createdSerialNoList) => {
    console.log("*** *** *** setQRCodeDetails");
    this.setState({
      wizardTab: tab,
      grpoNum,
      tabCursorStyle: ["pointer", "pointer", "not-allowed", "default"],
      normalItemsList,
      createdBatchList,
      createdSerialNoList,
    });
  };

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
    if (this.props.location.state) {
      console.log(
        "componentDidMount - selectedProductionOrder: " +
          this.props.location.state.selectedProductionOrder,
      );
      this.setGRPODraftDetails(
        "Create",
        null,
        3,
        this.props.userRole,
        this.props.location.state.selectedProductionOrder,
      );
    }
    await this.approverOriginatorCheck();
    // this.setState({
    //   draftStatus: this.getStatusFromQueryString()
    // });
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
                            Transfer Requests
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
                            href="#"
                            role="tab"
                            style={{ cursor: this.state.tabCursorStyle[2] }}
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
                  {hasCreatePermission && this.state.wizardTab === 1 && (
                    <TabPane tabId="wizardTab1">
                      <StockTransferRequestList
                        userRole="ORIGINATOR"
                        prevTab={1}
                        setGRPODraftDetails={this.setGRPODraftDetails}
                        draftStatus={this.state.draftStatus}
                      />
                    </TabPane>
                  )}
                  {/** Tab#2 */}
                  {hasCreatePermission && this.state.isApprover && this.state.wizardTab === 2 && (
                    <TabPane tabId="wizardTab2">
                      <StockTransferRequestList
                        userRole="APPROVER"
                        prevTab={2}
                        setGRPODraftDetails={this.setGRPODraftDetails}
                        draftStatus={this.state.draftStatus}
                      />
                    </TabPane>
                  )}
                  {hasCreatePermission && this.state.wizardTab === 3 && (
                    <TabPane tabId="wizardTab3">
                      <StockTransferRequestDetails
                        operation={this.state.operation}
                        userRole={this.state.userRole}
                        selectedStockTransReq={this.state.selectedStockTransReq}
                        //setGRPODraftDetails={this.setGRPODraftDetails}
                        selectedProductionOrder={this.state.selectedProductionOrder}
                        setQRCodeDetails={this.setQRCodeDetails}
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

export default StockTransferRequests;
