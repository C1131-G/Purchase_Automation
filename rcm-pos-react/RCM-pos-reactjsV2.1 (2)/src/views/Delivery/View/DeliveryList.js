import React, { Suspense } from "react";
import axios from "axios";
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
import { Printer } from "react-feather";
import FavouriteButton from "../../../components/FavouriteButton";
import StatusColumn from "../../../components/Columns/StatusColumn";
import ApproverDetailsColumn from "../../../components/Columns/ApproverDetailsColumn";
import PrintCrystalReport from "../../components/PrintCrystalReport";

import { showWarningMsg, formatDate } from "../../../config/util.js";
import {
  userRoles,
  draftStatus as draftStatusList,
  portalModules,
  displayModes,
  isModuleApprovalsEnabled,
} from "../../../config/config";
import { getDelivery } from "../../../helper/delivery";

class DeliveryList extends React.PureComponent {
  state = {
    operation: "",
    allRecords: [],
    filteredRecords: [],
    sort: {
      column: null,
      direction: "desc",
    },
    draftStatus: this.props.draftStatus,
    count: 0,
    warningMsg: "",
    successMsg: "",
    isLoading: false,
  };

  /**
   * Gets all record details from API and sets them to state variables
   */
  getRecords = async () => {
    console.log("Index - getRecords() this.props.userRole: " + this.props.userRole);
    this.setState({ isLoading: true });
    let filteredRecords = [];
    const { draftStatus } = this.state;

    try {
      const response = await getDelivery({
        userRole: this.props.userRole,
        userId: localStorage.getItem("InternalKey"),
      });
      console.log(`getRecords: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        if (draftStatus === "ALL" || !draftStatus) filteredRecords = response;
        else {
          filteredRecords = response.filter((rec) => {
            return rec.U_DraftStatus === this.state.draftStatus;
          });
        }
        this.setState({
          allRecords: response,
          filteredRecords,
          count: response.length,
        });
      }
    } catch (error) {
      this.setState({ warningMsg: error.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /**
   * Filter records based on the selected "Status"
   */
  handleStatusChange = (draftStatus) => {
    const { allRecords } = this.state;
    let filteredRecords = [];
    if (draftStatus === "ALL") filteredRecords = allRecords;
    else {
      filteredRecords = allRecords.filter((rec) => {
        return rec.U_DraftStatus === draftStatus;
      });
    }
    this.setState({
      draftStatus,
      filteredRecords,
      count: filteredRecords.length,
    });
  };

  /**
   * Filters records based on the 'searchKey' and returns the matching records.
   * @param {String} searchKey
   */
  handleSearch = (searchKey) => {
    console.log(`Index - handleSearch - ${searchKey}`);
    searchKey = searchKey.trim();
    const { allRecords } = this.state;
    let filteredRecords = [];

    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }
    allRecords.forEach((rec) => {
      if (
        (rec.DocEntry && rec.DocEntry.toString().indexOf(searchKey) > -1) ||
        (rec.DocNum && rec.DocNum.toString().indexOf(searchKey) > -1) ||
        //NOTE: without NULL check the below line was causing below error when performing search
        //as this value was not present in the records
        //    Cannot read property 'toString' of undefined
        // || rec.DocNum.toString().indexOf(searchKey) > -1
        rec.NumAtCard.toUpperCase().indexOf(searchKey) > -1 ||
        rec.CardName.toUpperCase().indexOf(searchKey) > -1 ||
        (rec.CardCode && rec.CardCode.toUpperCase().indexOf(searchKey) > -1) ||
        (rec.Comments && rec.Comments.toUpperCase().indexOf(searchKey) > -1) ||
        (rec.U_DraftStatus && rec.U_DraftStatus.toUpperCase().indexOf(searchKey) > -1) ||
        (rec.Originator && rec.Originator.toUpperCase().indexOf(searchKey) > -1) ||
        (rec.Approver && rec.Approver.toUpperCase().indexOf(searchKey) > -1)
      ) {
        filteredRecords.push(rec);
      }
    });
    //console.log(`filteredRecords: ${JSON.stringify(filteredRecords)}`);
    this.setState({
      filteredRecords,
      count: filteredRecords.length,
      draftStatus: "ALL",
    });
  };

  handleSort = (column) => (e) => {
    /** sorting recs. based on DocDate didnt work as expected, so using this hack
     * As sorting recs. based on DocEntry
     * gives teh same result, using DocEntry for Document Date col. as well
     */
    let actualColumn = column;
    if (column === "DocDate") column = "DocEntry";

    const direction = this.state.sort.column
      ? this.state.sort.direction === "asc"
        ? "desc"
        : "asc"
      : "desc";
    const sortedData = this.state.filteredRecords.sort((a, b) => {
      //Sorting dates return inconsistent results. It doesnt sort dates correctly at times
      /*if (column === "DocDate") {
        return new Date(a[column]) - new Date (b[column]);
      }
      else */
      if (isNaN(a[column])) {
        const valueA = a[column].toUpperCase();
        const valueB = b[column].toUpperCase();
        if (valueA < valueB) {
          return -1;
        }
        if (valueA > valueB) {
          return 1;
        }
        //names are equal
        return 0;
      } else {
        return a[column] - b[column];
      }
    });

    if (direction === "desc") {
      sortedData.reverse();
    }

    this.setState({
      filteredRecords: sortedData,
      sort: {
        column: actualColumn, //this to show the arrow on the sorted col.
        direction,
      },
    });
  };

  setSortArrow = (column) => {
    let className = "sort-direction";
    if (this.state.sort.column === column) {
      className += this.state.sort.direction === "asc" ? " asc" : " desc";
    }
    return className;
  };

  /*
  This wasn't required for the Dashboard selection to work, after I added
  getDashboardTileSelection() in the index.js

  componentDidUpdate (prevProps, prevState) {
    console.log("DeliveryList - componentDidUpdate draftStatus: "+this.props.draftStatus);
    if (this.props.draftStatus && !prevProps.draftStatus) {
      // this.setState({ draftStatus: this.props.draftStatus});
      this.handleStatusChange(this.props.draftStatus);
    }
  }*/

  async componentDidMount() {
    console.log("DeliveryList - componentDidMount userRole: " + this.props.userRole);
    console.log("DeliveryList - componentDidMount draftStatus: " + this.props.draftStatus);
    /**
     * When a Draft is updated, "operation" will be set as "Saved", in which case updated Draft records must
     * be fetched from API.
     * When Edit popup is closed "operation" will be set as "Cancel", NO action is required at that time
     */
    if (this.state.operation !== "Cancel") await this.getRecords();
  }

  render() {
    //show the 'Edit' column only if the currently logged in user has the required permission
    /*if(checkUserPermission(portalModules.USER, permissions.WRITE) && this.props.userRole === userRoles.APPROVER) {
      userListTableHead.push("Edit");
    }*/
    let colName;
    //Display the Approver name if the current user's role is Originator else...
    /*if(this.props.userRole === userRoles.ORIGINATOR) {
      colName = "Approver Details";
    }
    else if (this.props.userRole === userRoles.APPROVER) {
      colName = "Requestor";
    }*/

    const draftsTableHeader = [
      { label: "#" },
      { label: "Request#", sortField: "DocEntry" },
      { label: "Document Date", sortField: "DocDate" },
      { label: "Customer Code/ Name", sortField: "CardCode" },
      { label: "Customer Ref#", sortField: "NumAtCard" },
      // { label: "Customer name", sortField: "CardName" },
      { label: "Request Status", sortField: "U_DraftStatus" },
      { label: "Approver Details" },
    ];

    if (isModuleApprovalsEnabled) {
      draftsTableHeader.push(
        { label: "Request Status", sortField: "U_DraftStatus" },
        { label: "Approver Details" },
      );

      if (this.props.userRole === userRoles.APPROVER) {
        draftsTableHeader.push({ label: "Requestor", sortField: "Originator" });
        draftsTableHeader.push({ label: "No. Of Approvals", sortField: "U_NoOfApprovals" });
      }
    }

    return (
      <>
        {/* Page content */}
        <Row>
          <Col className="order-xl-1" xl="12">
            <Row>
              <Col className="mb-5 mb-xl-0" xl="12">
                <Card className="bg-white shadow">
                  <CardHeader className="border-0 mb--4 mt--2">
                    {" "}
                    {/** bg-white */}
                    <Row className="align-items-center border-bottom mt--1">
                      <Col md="8">
                        {/* <h3 className="mb-1.5"> List </h3> */}
                        <div className="mb-2 mt--2">
                          <i className="fa fa-info-circle text-blue" /> &nbsp;
                          <small>
                            {this.props.userRole === userRoles.ORIGINATOR
                              ? "List of Delivery Requests you submitted. Click on a Request# to review the request."
                              : "List of Delivery Requests awaiting your approval. Click on the Request# to review the request."}
                          </small>
                        </div>
                      </Col>
                      <Col className="text-right" md="3">
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
                            <>
                              <small className="my-2 text-primary">Processing... &emsp;</small>
                              <Spinner color="primary" className="reload-spinner" />
                            </>
                          )}
                        </div>
                      </Col>
                      <Col className="text-right" md="1">
                        {/* <FavouriteButton /> */}
                      </Col>
                    </Row>
                    <Row className="text-left mb-3">
                      <Col md="3" className="mt-1">
                        {isModuleApprovalsEnabled && (
                          <>
                            <small className="text-muted">Status</small>
                            <Input
                              bsSize="sm"
                              style={{ width: 150 + "px" }}
                              type="select"
                              value={this.state.draftStatus}
                              onChange={(e) => this.handleStatusChange(e.target.value)}
                            >
                              <option value="ALL">All</option>
                              <option value="PENDING">Pending</option>
                              <option value="APPROVED">Approved</option>
                              <option value="REJECTED">Rejected</option>
                            </Input>
                          </>
                        )}
                      </Col>
                      <Col md="3" className="mt-2 ml--4 text-left">
                        {/* <small className="text-muted">Count</small>
                      <p><small>{this.state.count}</small></p> */}
                      </Col>
                      <Col md="2"></Col>
                      <Col md="4" className="mt-2 pt-1">
                        <FormGroup
                          className={classnames({
                            focused: this.state.searchAltFocused,
                          })}
                        >
                          <InputGroup className="input-group mb--4 ml-0 mt-3" size="sm">
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
                      </Col>
                    </Row>
                  </CardHeader>
                  <Card className="table-fixed-head table-fixed-head-lg">
                    <Table
                      size="sm"
                      // style={{borderSpacing: 0}}
                      style={{ borderCollapse: "collapse" }} //Added to reduce spacing b/w cells
                      className="align-items-center table-flush"
                      responsive
                    >
                      <thead className="thead-light">
                        <tr>
                          {draftsTableHeader.map((headerCol, key) => {
                            return headerCol.label !== colName ? (
                              <th
                                scope="col"
                                onClick={this.handleSort(headerCol.sortField)}
                                // style={{cursor: "pointer"}}
                                style={{
                                  padding: "10px 15px",
                                  textAlign:
                                    headerCol.label === "Approver Details" ? "center" : "auto",
                                }} //Added to reduce spacing b/w cells
                                className="cursor-pointer"
                              >
                                {headerCol.label}
                                <span className={this.setSortArrow(headerCol.sortField)} />
                              </th>
                            ) : (
                              // :
                              // (headerCol.label !== "Vendor Ref#") ?
                              //   <th scope="col"
                              //     onClick={this.handleSort(headerCol.sortField)}
                              //     // style={{padding: 0, margin: 0}}
                              //     className="cursor-pointer"
                              //   >
                              //     {headerCol.label}
                              //     <span className={this.setSortArrow(headerCol.sortField)} />
                              //   </th>
                              <th
                                scope="col"
                                onClick={
                                  colName === "Requestor" ? this.handleSort(colName) : undefined
                                }
                                style={{
                                  padding: "10px 15px", //Added to reduce spacing b/w cells
                                  cursor: colName === "Requestor" ? "pointer" : "default",
                                }}
                              >
                                {colName}
                                <span className={this.setSortArrow(colName)} />
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(this.state.filteredRecords) &&
                        this.state.filteredRecords.length > 0 ? (
                          this.state.filteredRecords.map((rec, key) => {
                            return (
                              <tr key={rec.DocNum ? rec.DocNum : rec.DocEntry}>
                                <td>{key + 1}</td>
                                <th className="mb-0 text-sm" scope="row">
                                  <a
                                    style={{ cursor: "pointer", textDecoration: "underline" }}
                                    onClick={() =>
                                      this.props.setSelectedRecordDetails(
                                        displayModes.VIEW,
                                        rec,
                                        3,
                                        this.props.userRole,
                                      )
                                    }
                                  >
                                    {/** For AUTO_APPROVED recs. DocNum will be displayed */}
                                    {rec.DocNum ? rec.DocNum : rec.DocEntry}
                                  </a>
                                  {/* {[draftStatusList.AUTO_APPROVED, draftStatusList.APPROVED].includes(rec.U_DraftStatus) &&
                              <PrintCrystalReport
                                className="ml-3"
                                moduleName={portalModules.DELIVERY}
                                recordStatus={rec.U_DraftStatus}
                                docEntry={rec.DocEntry}
                                targetRecDocNum={rec.U_TargetRecDocNum}
                              />
                              } */}
                                </th>
                                {/* style={{width:"10px"}} */}
                                <td>{formatDate(rec.DocDate, "MMMM D, YYYY")}</td>
                                <td style={{ whiteSpace: "unset" }}>
                                  <b>{`${rec.CardCode}-${rec.CardName}`}</b>
                                </td>
                                <td style={{ whiteSpace: "normal" }}>{rec.NumAtCard}</td>
                                {/*** NOTE: added style={{whiteSpace: 'unset'}} - to word-wrap the cell content */}
                                {/* Hiding Remarks
                            <td style={{width:"20%", whiteSpace: "unset"}}>{rec.Comments}</td> */}

                                {isModuleApprovalsEnabled && (
                                  <>
                                    <td style={{ width: "10%", textAlign: "center" }}>
                                      <StatusColumn
                                        status={rec.U_DraftStatus}
                                        targetRecDocNum={rec.U_TargetRecDocNum}
                                        gatePassNum={rec.U_GatePassNum}
                                        targetRecord={portalModules.DELIVERY}
                                      />
                                    </td>
                                    <td>
                                      <ApproverDetailsColumn
                                        approverDetails={rec.approvers}
                                        multiLevelApproval={rec.U_MultiLevelApproval === "Y"}
                                        showDateTime={false}
                                      />
                                    </td>
                                    {this.props.userRole === userRoles.APPROVER && (
                                      <>
                                        <td>{rec.Originator} </td>
                                        <td>{rec.U_NoOfApprovals ? rec.U_NoOfApprovals : " NA"}</td>
                                      </>
                                    )}
                                  </>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            {/** Warning msg should span across the width of the table, so setting 'colSpan' with no. of columns */}
                            <td colSpan={6}>
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
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </>
    );
  }
}

export default DeliveryList;
