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
import { showWarningMsg, formatDate } from "../../config/util.js";
import Header from "../../components/Headers/Header";
import {
  draftStatus as draftStatusList,
  userRoles,
  portalModules,
  displayModes,
  isModuleApprovalsEnabled,
} from "../../config/config";
import FavouriteButton from "components/FavouriteButton";
import StatusColumn from "../../components/Columns/StatusColumn";
import ApproverDetailsColumn from "../../components/Columns/ApproverDetailsColumn";

// import "./table-sort.scss";
// import"./fixed-header.scss";

class InventoryCountingList extends React.Component {
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
   * Gets all records details from API and sets them to state variables
   */
  getRecords = async () => {
    console.log("Index - getRecords() this.state.draftStatus: " + this.state.draftStatus);
    this.setState({ isLoading: true });
    let filteredRecords = [];
    const { draftStatus } = this.state;

    //const openOrderAPI = `GRPOList?$select=DocNum,CardCode,CardName,DocDate,Comments&$filter=DocumentStatus eq 'bost_Open'`;
    try {
      const response = await api.get("/custom/inventory-counting", {
        params: { userRole: this.props.userRole, userId: localStorage.getItem("InternalKey") },
      });
      console.log(`getRecords response.data: ${JSON.stringify(response.data)}`);
      if (Array.isArray(response.data) && response.data.length) {
        if (draftStatus === "ALL" || !draftStatus) filteredRecords = response.data;
        else {
          filteredRecords = response.data.filter((rec) => {
            return rec.U_DraftStatus == this.state.draftStatus;
          });
        }
        this.setState({
          allRecords: response.data,
          filteredRecords,
          count: response.data.length,
        });
      }
    } catch (error) {
      console.log(" error.data: " + JSON.stringify(error));
      this.setState({ warningMsg: "" }); //error.message
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /**
   * Filter records based on the selected "Status"
   */
  handleStatusChange = (event) => {
    let draftStatus = event.target.value;
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
   * @param {String} searchKey Req# or Status or...
   */
  handleSearch = (searchKey) => {
    console.log(`Index - handleSearch - ${searchKey}`);
    searchKey = searchKey.trim();
    const { allRecords } = this.state;
    let filteredRecords = [];

    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }
    allRecords.forEach((request) => {
      if (
        request.DocEntry.toString().indexOf(searchKey) > -1 ||
        (request.ToWhsCode && request.ToWhsCode.toUpperCase().indexOf(searchKey) > -1) ||
        (request.FromWhsCod && request.FromWhsCod.toUpperCase().indexOf(searchKey) > -1) ||
        (request.Comments && request.Comments.toUpperCase().indexOf(searchKey) > -1) ||
        (request.U_DraftStatus && request.U_DraftStatus.toUpperCase().indexOf(searchKey) > -1) ||
        (request.Originator && request.Originator.toUpperCase().indexOf(searchKey) > -1) ||
        (request.Approver && request.Approver.toUpperCase().indexOf(searchKey) > -1)
      ) {
        filteredRecords.push(request);
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
      if (a[column] && b[column] && isNaN(a[column]) && isNaN(b[column])) {
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

  async componentDidMount() {
    console.log("InventoryCountingList - componentDidMount userRole: " + this.props.userRole);
    console.log("InventoryCountingList - componentDidMount draftStatus- " + this.props.draftStatus);
    /**
     * When a rec. is updated, "operation" will be set as "Saved", in which case updated Draft records must
     * be fetched from API.
     * When Edit popup is closed "operation" will be set as "Cancel", NO action is required at that time
     */
    if (this.state.operation !== "Cancel") {
      await this.getRecords();
    }
  }

  render() {
    //show the 'Edit' column only if the currently logged in user has the required permission
    /*if(checkUserPermission(portalModules.USER, permissions.WRITE) && this.props.userRole === userRoles.APPROVER) {
      userListTableHead.push(displayModes.EDIT);
    }*/
    let colName;
    //Display the Approver name if the current user's role is Originator else...
    /*if(this.props.userRole === userRoles.ORIGINATOR) {
      colName = "Approver Details";
    }
    else if (this.props.userRole === userRoles.APPROVER) {
      colName = "Requestor";
    }*/
    const requestTableHeader = [
      { label: "Request#", sortField: "DocEntry" },
      { label: "Document Date", sortField: "DocDate" },
      /*{ label: "Item Number", sortField: "ItemCode" },
      { label: "Item Description", sortField: "ItemName" },
      { label: "Qty", sortField: "Quantity" },
      { label: "UOM", sortField: "unitMsr" },*/
      //{ label: "From Warehouse", sortField: "FromWhsCod" },
      { label: "To Warehouse", sortField: "ToWhsCode" },
      { label: "To Bin Loc.", sortField: "U_ToBinLocation" },
    ];

    if (isModuleApprovalsEnabled) {
      requestTableHeader.push(
        { label: "Status", sortField: "U_DraftStatus" },
        { label: "Approver Details" },
      );

      if (this.props.userRole === userRoles.APPROVER) {
        requestTableHeader.push({ label: "Requestor", sortField: "Originator" });
      }
    }

    return (
      <>
        {/* Page content */}
        <Row>
          <Col className="order-xl-1" xl="12">
            {/** StockTransfer Table */}
            <Row>
              <Col className="mb-5 mb-xl-0" xl="12">
                <Card className="bg-white shadow">
                  <CardHeader className="border-0 mb--4 mt--2">
                    {" "}
                    {/** bg-white */}
                    <Row className="align-items-center border-bottom mt--2">
                      <Col md="8">
                        {/* <h3 className="mb-1.5"> StockTransfer List </h3> */}
                        <div className="mb-2 mt--2">
                          <i className="fa fa-info-circle text-blue" /> &nbsp;
                          <small>
                            {this.props.userRole === userRoles.ORIGINATOR
                              ? "List of Inventory Countings you submitted. Click on a Request# to view the request details."
                              : "List of Inventory Countings awaiting your approval. Click on the Request# to view the request details."}
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
                              onChange={(e) => this.handleStatusChange(e)}
                            >
                              <option value="ALL">All</option>
                              <option value={draftStatusList.PENDING}>Pending</option>
                              <option value={draftStatusList.APPROVED}>Approved</option>
                              <option value={draftStatusList.REJECTED}>Rejected</option>
                              <option value={draftStatusList.AUTO_APPROVED}>Auto Approved</option>
                            </Input>
                          </>
                        )}
                      </Col>
                      <Col md="3" className="mt-2 ml--4 text-left">
                        {/* <small className="text-muted">Count</small>
                      <p><small>{this.state.count}</small></p> */}
                      </Col>
                      <Col md="3" className="mt-2 pt-1">
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
                      <Col md="3" className="mt-4 pt-1 mr-3 text-right">
                        <Button
                          size="sm"
                          color="primary"
                          type="button"
                          onClick={() =>
                            this.props.setRecordDetails(
                              displayModes.CREATE,
                              null,
                              3,
                              this.props.userRole,
                            )
                          }
                        >
                          Create New
                        </Button>
                      </Col>
                    </Row>
                  </CardHeader>
                  {/**<Card className="mt--2 shadow">
                <CardBody> */}
                  {/**
                 * NOTE: Adding 'table-fixed-head' to <div> tag didn't make the thead sticky
                 * replacing it with <Card> worked
                    <div className="table-fixed-head table-fixed-head-lg">
                */}
                  <Card className="table-fixed-head table-fixed-head-lg">
                    <Table size="sm" className="align-items-center table-flush" responsive>
                      <thead className="thead-light">
                        <tr>
                          {requestTableHeader.map((headerCol, key) => {
                            return headerCol.label !== colName ? (
                              <th
                                scope="col"
                                key={headerCol.label}
                                onClick={this.handleSort(headerCol.sortField)}
                                className="cursor-pointer"
                                style={{
                                  textAlign:
                                    headerCol.label === "Approver Details" ? "center" : "auto",
                                }}
                              >
                                {headerCol.label}
                                <span className={this.setSortArrow(headerCol.sortField)} />
                              </th>
                            ) : (
                              <th
                                scope="col"
                                key={headerCol.label}
                                onClick={
                                  colName === "Requestor" ? this.handleSort(colName) : undefined
                                }
                                style={{
                                  cursor: colName === "Requestor" && "pointer",
                                  textAlign: "center",
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
                        this.state.filteredRecords.length ? (
                          this.state.filteredRecords.map((request, key) => {
                            return (
                              <tr key={request.DocEntry}>
                                <th className="mb-0 text-sm" scope="row">
                                  <a
                                    style={{ cursor: "pointer", textDecoration: "underline" }}
                                    onClick={
                                      request.U_DraftStatus === draftStatusList.PENDING
                                        ? () =>
                                            this.props.setRecordDetails(
                                              displayModes.EDIT,
                                              request,
                                              3,
                                              this.props.userRole,
                                              portalModules.INVENTORY_COUNTING,
                                            )
                                        : () =>
                                            this.props.setRecordDetails(
                                              displayModes.VIEW,
                                              request,
                                              3,
                                              this.props.userRole,
                                              portalModules.INVENTORY_COUNTING,
                                            )
                                    }
                                  >
                                    {request.DocEntry}
                                  </a>
                                </th>
                                {/* style={{width:"10px"}} */}
                                <td>{formatDate(request.DocDate, "MMMM D, YYYY")}</td>
                                {/* <td><b>{request.ItemCode}</b></td>
                            <td style={{whiteSpace: "unset"}}>{request.ItemName}</td>
                            <td>{request.Quantity}</td>
                            <td>{request.unitMsr}</td> */}
                                {/*** NOTE: added style={{whiteSpace: 'unset'}} - to word-wrap the cell content */}
                                {/* Hiding Remarks
                            <td style={{width:"20%", whiteSpace: "unset"}}>{request.Comments}</td> */}
                                {/* <td>{request.FromWhsCod}</td> */}
                                <td>{request.ToWhsCode}</td>
                                <td>{request.U_ToBinLocation ? request.U_ToBinLocation : "NA"}</td>
                                {isModuleApprovalsEnabled && (
                                  <>
                                    <td style={{ width: "10%", textAlign: "left" }}>
                                      <StatusColumn
                                        status={request.U_DraftStatus}
                                        targetRecDocNum={request.U_TargetRecDocNum}
                                      />
                                    </td>
                                    <td>
                                      <ApproverDetailsColumn
                                        approverDetails={request.approvers}
                                        multiLevelApproval={request.U_MultiLevelApproval === "Y"}
                                        showDateTime={false}
                                      />
                                    </td>
                                    {this.props.userRole === userRoles.APPROVER && (
                                      <td>{request.Originator} </td>
                                    )}
                                  </>
                                )}
                                {/*checkUserPermission(portalModules.USER, permissions.WRITE) &&
                              <td style={{ textAlign: "center" }}>
                                <Edit
                                  size={20}
                                  className="mr-1 pb-1 text-primary"
                                  style={{cursor: "pointer"}}
                                  onClick={() => this.setRecordDetails(displayModes.EDIT, request)}
                                />
                              </td>
                            */}
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
                  {/*</CardBody></Card>*/}
                </Card>
              </Col>
            </Row>
            {/*
            <Card className="bg-white shadow">
              <CardHeader className="border-1 mb--4"> {/**bg-white}
                <Row className="align-items-center">
                  <Col xs="8">
                    <h3 className="mb-0">StockTransfer List</h3>
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

export default InventoryCountingList;
