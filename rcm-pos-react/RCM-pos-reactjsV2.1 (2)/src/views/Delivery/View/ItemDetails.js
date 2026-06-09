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
  Table,
  Spinner,
  InputGroup,
  Popover,
  PopoverBody,
} from "reactstrap";
import { Tooltip } from "reactstrap";
import QRCode from "qrcode.react";
import ToastMessage from "../../../components/ToastMessage";
import PreviewPrintQRCodes from "../../components/PreviewPrintQRCodes";
import { getBatchSerialsFromItemsList } from "../../../helper/helper";

import { getDeliveryItems, getDeliveryTax, updateDelivery } from "../../../helper/delivery";

import api from "../../../config/api-nodejs";
//for Mock API
import { scrollToElement, formatDate, showWarningMsg } from "../../../config/util.js";
import { realistic, fireworks } from "../../../util/confetti";
import {
  userRoles,
  draftStatus as requestStatus,
  systemCurrency,
  itemTypeProperties,
  recordTypes,
  displayModes,
  statusColors,
  isMultiBranchEnabled,
} from "../../../config/config.js";
import "../../../assets/css/custom-style.scss";

class ItemDetails extends React.Component {
  _isMounted = false;
  state = {
    error: "",
    warningMsg: "",
    rejectReasonPopup: false,
    qrCodesPopup: false,
    rejectReason: "",
    popupWarningMsg: "",
    selectedRecord: {},
    draftStatus: "",
    draftStatusAfterApproval: "",
    itemsList: [],
    docEntry: "",
    docNum: "",
    docDate: "",
    comments: "",
    warehouse: "",
    binLocation: "",
    freightPopOver: false,
    invalidInput: {},
    branch: "",
    totalTax: "",
    totalTaxFC: "",
    batchSerialsList: [],
  };

  toggleModal = (name) => {
    console.log("toggleModal");
    /**
     * Added cond. to check Component "mounted" status to fix below warning 
     *    Warning: Can't perform a React state update on an unmounted component.
     *    This is a no-op, but it indicates a memory leak in your application.
     *    To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
    in ItemDetails (at GRPODraftDetails.js:62)
    in Suspense (at GRPODraftDetails.js:61)
     */
    if (this._isMounted) {
      this.setState({
        [name]: !this.state[name],
      });
    }
  };

  toggleComponent = (name) => {
    console.log("toggleModal");
    this.setState({
      [name]: !this.state[name],
    });
  };

  /**
   * Gets the DocEntry for the TargetRecDocNum (GRPO#)
   * @param {*} moduleName
   * @param {*} targetRecDocNum
   */
  getTotalTax = async () => {
    this.setState({ isLoading: true });
    try {
      let response;
      //if the selected record is a Delivery
      if (this.props.selectedRecord.U_DraftStatus === requestStatus.AUTO_APPROVED) {
        response = await getDeliveryTax(recordTypes.DIRECT, {
          docNum: this.props.selectedRecord.DocNum,
        });
      }
      //if the selected record is a Draft
      else {
        response = await getDeliveryTax(recordTypes.DRAFT, {
          docEntry: this.props.selectedRecord.DocEntry,
        });
      }

      if (Array.isArray(response) && response.length > 0) {
        console.log(`getTotalTax: ${JSON.stringify(response)}`);
        this.setState({
          totalTax: response[0].TaxSum,
          totalTaxFC: response[0].TaxSumFrgn,
        });
      }
    } catch (error) {
      this.setState({ warningMsg: error.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /**
   * Gets all Items under a selected Draft
   */
  getItemDetails = async () => {
    console.log("ItemDetails - getItemDetails()");
    if (!this.state.itemsList.length) {
      this.setState({ isLoading: true });
      try {
        let response;

        //if the selected record is a Delivery
        if (this.props.selectedRecord.U_DraftStatus === requestStatus.AUTO_APPROVED) {
          response = await getDeliveryItems(recordTypes.DIRECT, {
            docNum: this.props.selectedRecord.DocNum,
          });
        }
        //if the selected record is a Draft
        else {
          response = await getDeliveryItems(recordTypes.DRAFT, {
            docEntry: this.props.selectedRecord.DocEntry,
          });
        }
        let itemsList = response; //.data.draft.DocumentLines; //response.DocumentLines
        console.log(`getItemDetails - response: ${JSON.stringify(response)}`);
        if (response && Array.isArray(itemsList) && itemsList.length) {
          let freightInfoForDraft = response.freightInfoForDraft
            ? [...response.freightInfoForDraft]
            : [];
          let freightTotal = 0,
            freightTotalFC = 0;
          //Calculate Total Freight Amount to display in the popover
          if (Array.isArray(freightInfoForDraft) && freightInfoForDraft.length) {
            freightInfoForDraft.forEach((freight) => {
              freightTotal += parseFloat(freight.LineTotal);
              freightTotalFC += parseFloat(freight.LineTotalFC);
            });
          }

          const batchSerialsList = getBatchSerialsFromItemsList(itemsList);

          this.setState({
            /**this is the 'actual' Draft status, will be used to show/hide View QR Code btn
             * the other state var 'draftStatus' stores the DraftStatus status from APPROVALSTATUS table
             * if the current user is an 'Approver'
             */
            draftStatusAfterApproval: response.draftStatus,
            itemsList,
            freightInfoForDraft,
            freightTotal,
            freightTotalFC,
            docTotal: response.DocTotal,
            docTotalFc: response.DocTotalFc,
            batchSerialsList,
          });
        }
      } catch (error) {
        console.log("error:" + JSON.stringify(error.response));
        this.setState({ warningMsg: error.response.data.message });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  /** Closes the popup and clears certain data from "state" variables when Cancel button is clicked */
  closePopup = () => {
    this.toggleModal("rejectReasonPopup");
    this.setState({
      warningMsg: "",
      popupWarningMsg: "",
      invalidInput: {},
    });
    //Reset "state" variables in the Parent Component when the popup is closed
    //this.props.setGRPODraftDetails("Cancel", {}, 2);
  };

  /** Set the GRPODraft details from "props" to "state" and open the pop-up window
   */
  openTab = () => {
    console.log("this.props.selectedRecord: ", JSON.stringify(this.props.selectedRecord));
    console.log(
      "this.props.selectedRecord.U_DraftStatus: " + this.props.selectedRecord.U_DraftStatus,
    );
    console.log(
      "this.props.selectedRecord.U_RejectedReason: " + this.props.selectedRecord.U_RejectedReason,
    );

    if (this.props.operation === displayModes.EDIT || this.props.operation === displayModes.VIEW) {
      console.log(`ItemDetails- operation: ${this.props.operation}`);
      this.setState({
        //NOTE: You dont have to set all the values from `props` to this comp's `state`. Only the values
        //that need to be changed in this comp. need to be set in the `state`. Values that are meant to
        //View-only can be shown directly from the `props` itself
        selectedRecord: this.props.selectedRecord,
        // internalKey: this.props.selectedRecord.InternalKey,
        docNum: this.props.selectedRecord.DocNum, //show DocNum (GRPO#) for AUTO_APPROVED GRPOs
        docEntry: this.props.selectedRecord.DocEntry,
        draftStatus: this.props.selectedRecord.U_DraftStatus,
        customerName: this.props.selectedRecord.CardName,
        customerCode: this.props.selectedRecord.CardCode,
        customerRefNo: this.props.selectedRecord.NumAtCard,
        rejectReason:
          this.props.selectedRecord.U_DraftStatus === requestStatus.REJECTED &&
          !this.props.selectedRecord.U_RejectedReason
            ? "NA"
            : this.props.selectedRecord.U_RejectedReason,
        docDate: this.props.selectedRecord.DocDate,
        comments: this.props.selectedRecord.Comments,
        warehouse: this.props.selectedRecord.WarehouseCode,
        binLocation: this.props.selectedRecord.binLocation,
        branch: this.props.selectedRecord.BPLName,
      });
    }
    //this.toggleModal("rejectReasonPopup");
    //this.props.setGRPODraftDetails(displayModes.VIEW, {}, 3, this.props.userRole);
  };

  /**
   * Validates the entered data before sending them API
   */
  handleApproval = (draftStatus) => async (event) => {
    event.preventDefault();
    let request, response, salt;
    const { firstName, lastName, username, customerName, customerCode, status, role } = this.state;
    let { invalidInput } = this.state;
    if (["", "null", null].includes(this.state.comments)) {
      invalidInput.comments = "is-invalid";
      this.setState({
        warningMsg: "Enter remarks",
        invalidInput,
      });
    } else if (
      draftStatus === requestStatus.REJECTED &&
      ["", "null", null].includes(this.state.rejectReason)
    ) {
      this.setState({ popupWarningMsg: "Please enter a reason and submit!" });
    } else {
      if (draftStatus === requestStatus.REJECTED) this.closePopup();

      this.setState({ isLoading: true });
      //prop names used in "request" payload below are taken from Service Layer sample "response"
      request = {
        userId: localStorage.getItem("InternalKey"),
        DocEntry: this.state.docEntry,
        Comments: this.state.comments,
        U_DraftStatus: draftStatus,
        U_RejectedReason: this.state.rejectReason,
        U_OriginatorId: this.props.selectedRecord.U_OriginatorId,
        U_ApprovalStatusId: this.props.selectedRecord.U_ApprovalStatusId,
        U_ApprovalLevel: this.props.selectedRecord.U_ApprovalLevel,
      };
      console.log("*** handleApproval - request: " + JSON.stringify(request));

      try {
        const response = await updateDelivery(request);
        const noOfDays = parseInt(response.noOfDays);
        console.log("*** APPROVED response: " + JSON.stringify(response));

        if (response.draftStatus) {
          console.warn("response.draftStatus: " + response.draftStatus);
          let successMsg;
          if ([requestStatus.APPROVED, requestStatus.PENDING].includes(response.draftStatus)) {
            successMsg = "Request has been Approved!";

            if (response.gatePassNum) {
              successMsg =
                successMsg +
                `<br /> Gate Pass# <b>${response.gatePassNum}</b> has been created successfully!`;
            }
            //if the Draft has been approved within 3 days of Creation is prev. Approval date
            //display Confetti
            if (noOfDays > -1 && noOfDays <= 3) {
              realistic();
            }
          } else if (response.draftStatus === requestStatus.REJECTED)
            successMsg = "Request has been rejected!";

          this.setState({
            //successMsg: response.message,
            draftStatus: response.draftStatus,
            successMsg,
          });
          //await this.getGRPODraftList();
        }
      } catch (error) {
        if (error.response) {
          this.setState({ warningMsg: error.response.data.message });
        } else {
          this.setState({ warningMsg: "Something went wrong! Please contact your administrator." });
        }
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  async componentDidUpdate(prevProps, prevState) {
    console.log("prevProp: " + JSON.stringify(prevProps.selectedRecord));
    //console.log("prevState: "+ JSON.stringify(prevState.selectedRecord))
    if (this.props.selectedRecord && !prevProps.selectedRecord) {
      await this.getTotalTax();
      await this.getItemDetails();
      this.openTab();
    }
    console.log("ItemDetails - componentDidUpdate - this.props.userRole: " + this.props.userRole);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    console.log("ItemDetails - componentDidMount");
    this._isMounted = true;
    if (this.props.selectedRecord !== null) {
      await this.getTotalTax();
      await this.getItemDetails();
      this.openTab();
    }
    console.log("ItemDetails - componentDidMount - this.props.userRole: " + this.props.userRole);
  }

  render() {
    const { batchSerialsList, itemsList } = this.state;
    const itemsTableHead = ["#", "Item Number", "Item Description", "Quantity", "Warehouse", "UOM"]; //, "Warehouse Loc.", "Bin Loc."

    let displayMode = displayModes.DISABLED;
    if (
      this.props.userRole === userRoles.APPROVER &&
      this.state.draftStatus === requestStatus.PENDING
    ) {
      displayMode = displayModes.NORMAL;
    }

    const { selectedRecord } = this.props;
    const currency = selectedRecord.DocCur;
    let totalTax;

    let docTotal;
    if (currency === systemCurrency) {
      totalTax = this.state.totalTax;

      if (selectedRecord.DocTotal) docTotal = parseFloat(selectedRecord.DocTotal).toFixed(3);
      else docTotal = 0.0;
    } else {
      totalTax = this.state.totalTaxFC;

      if (selectedRecord.DocTotalFC) docTotal = parseFloat(selectedRecord.DocTotalFC).toFixed(3);
      else docTotal = 0.0;
    }

    return (
      <>
        <Row>
          <Col className="order-xl-1" xl="12">
            <Card className="bg-white shadow">
              {" "}
              {/** bg-secondary */}
              <CardHeader className="border-0 mb--4 mt--2">
                {" "}
                {/** bg-white */}
                <Row className="align-items-center">
                  <Col md="9" className="text-left">
                    {/* <h3 className="mb-0 mt--3">Delivery Request </h3> */}
                    <h6 className="heading-small text-muted">Request information</h6>
                  </Col>
                  <Col className="text-right mr-0" md="3">
                    {this.state.isLoading ? (
                      <>
                        <i className="fa fa-info-circle text-blue" /> &nbsp;
                        <small className="my-2 text-primary">Processing...&emsp;</small>
                        <Spinner color="primary" className="reload-spinner" />
                      </>
                    ) : (
                      displayMode == displayModes.NORMAL && (
                        <>
                          <Button
                            size="sm"
                            color="primary"
                            type="button"
                            onClick={this.handleApproval(requestStatus.APPROVED)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            //className="ml-auto" //this will move the button to the left side of the modal
                            color="danger"
                            data-dismiss="modal"
                            type="button"
                            onClick={() => this.toggleModal("rejectReasonPopup")}
                          >
                            Reject
                          </Button>
                        </>
                      )
                    )}
                  </Col>
                  <Col md="3">
                    {this.state.draftStatus !== requestStatus.REJECTED &&
                      this.state.draftStatusAfterApproval !== requestStatus.REJECTED &&
                      Array.isArray(batchSerialsList) &&
                      batchSerialsList.length > 0 && (
                        <PreviewPrintQRCodes
                          // className="mt-2 pt-1 ml-2"
                          batchSerialsList={batchSerialsList}
                          batchNumberProperty={itemTypeProperties.BATCH_NUMBER}
                          internalSerialNumber={itemTypeProperties.SERIAL_NUMBER}
                          quantity="Quantity"
                          showPrintOptions={true}
                        />
                      )}
                  </Col>
                </Row>
                {/* <Row>
                    {this.state.draftStatus !== requestStatus.REJECTED &&
                      this.state.draftStatusAfterApproval !== requestStatus.REJECTED &&
                      //  Array.isArray(batchSerialsList) && batchSerialsList.length > 0 && 
                        <PreviewPrintQRCodes
                          // className="mt-2 pt-1 ml-2"
                          batchSerialsList={batchSerialsList}
                          batchNumberProperty={itemTypeProperties.BATCH_NUMBER}
                          internalSerialNumber={itemTypeProperties.SERIAL_NUMBER}
                          quantity="Quantity"
                          showPrintOptions={true}
                        />
                    }
                  </Row> */}
              </CardHeader>
              <CardBody className="mt--2">
                {/* <h6 className="heading-small text-muted mb-3">
                    Request information
                  </h6> */}
                {/** <div className="pl-lg-3 pr-lg-3 mt--1 mb-2"> */}
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow-xl">
                  {" "}
                  {/** text-center */}
                  <Row>
                    <Col md="3" sm="6">
                      <small className="text-muted">Request#</small>
                      <h4 className="mt-1">
                        {/** Display GPRO# for AUTO_APPROVED GRPOs & DocEntry for Drafts, bcoz DocNums
                         * are NOT unique for Drafts, so cant use it */}
                        {this.state.docNum ? this.state.docNum : this.state.docEntry}
                      </h4>
                    </Col>
                    <Col md="3" sm="6">
                      <small className="text-muted">Customer Reference#</small>
                      <h4 className="mt-1">{this.state.customerRefNo}</h4>
                    </Col>
                    <Col md="3" sm="6">
                      {this.state.draftStatus === requestStatus.REJECTED ? (
                        <>
                          <small className="text-muted">Reason for Rejection</small>
                          <h4 className="mt-1">{this.state.rejectReason}</h4>
                        </>
                      ) : (
                        <>
                          <small className="text-muted">Customer Name</small>
                          <h4 className="mt-1">{this.state.customerName}</h4>
                        </>
                      )}
                    </Col>
                    {/* <Col md="4">
                        <small className="text-muted">Customer Code </small>
                        <h4 className="mt-1">{this.state.customerCode}</h4>
                      </Col>
                    </Row>
                    <Row className="mt-2">
                      <Col md="4">
                        <small className="text-muted">Posting Date</small>
                        <h4 className="mt-1">{formatDate(this.state.docDate, "MMMM D, YYYY")}</h4>
                      </Col>
                      */}
                    <Col md="3" sm="6">
                      <small className="text-muted">Remarks</small>
                      <FormGroup className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          rows="2"
                          type="textarea"
                          value={this.state.comments}
                          className="form-control display-4 text-gray-dark"
                          id="input-customer-remarks"
                          placeholder="Enter Remarks"
                          onChange={(e) => this.setState({ comments: e.target.value })}
                          disabled={displayMode == displayModes.DISABLED ? true : false}
                        />
                      </FormGroup>
                    </Col>
                    {/* Display the Branch info only when Multiple Branches are configured */}
                    {isMultiBranchEnabled && (
                      <Col md="3">
                        <small className="text-muted">Branch</small>
                        <h4 className="mt-1">{this.state.branch ? this.state.branch : "NA"}</h4>
                      </Col>
                    )}
                    <Col md="3">
                      <small className="text-muted">Warehouse</small>
                      <h4 className="mt-1">{this.state.warehouse ? this.state.warehouse : "NA"}</h4>
                    </Col>
                    <Col md="3">
                      <small className="text-muted">Bin Location</small>
                      <h4 className="mt-1">
                        {this.state.binLocation ? this.state.binLocation : "NA"}
                      </h4>
                    </Col>
                  </Row>
                </Card>
                {/** <hr className="my-2" /> */}

                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
                  <Row className="mt--1">
                    <Col sm="6" md="3">
                      <small className="text-muted">Discount %</small>
                      <h4 className="mt-1">
                        {parseFloat(selectedRecord.DiscountPercent).toFixed(3)}
                      </h4>
                      {/* <FormGroup className="mt-1">
                          <Input
                            bsSize="sm"
                            style={{ width: 55 + "%" }}
                            value={selectedRecord.DiscountPercent}
                            className={"form-control display-4 text-gray-dark "}
                            id="input-disc-perc"
                            placeholder=""
                            type="number"
                            disabled
                            onChange={(e) => this.handleDiscountPercentChange(e.target.value)}
                          />
                        </FormGroup> */}
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Total Tax</small>
                      <h4 className="mt-1">
                        {currency} {totalTax ? parseFloat(totalTax).toFixed(3) : 0.0}
                      </h4>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Discount Amount</small>
                      <h4 className="mt-1">
                        {currency}{" "}
                        {currency === systemCurrency
                          ? parseFloat(selectedRecord.TotalDiscount).toFixed(3)
                          : parseFloat(selectedRecord.TotalDiscountFC).toFixed(3)}
                      </h4>
                    </Col>
                    {/* <Col sm="6" md="3">
                        <small className="text-muted">Freight</small>
                        <FormGroup className="mt-0">
                          <InputGroup>
                            <h4 className="mt-1">{currency} &nbsp;
                              {currency === systemCurrency ? this.state.freightTotal
                                : this.state.freightTotalFC}
                            </h4>
                            <span
                              id="freightPopOverBtn" className="text-warning ml-2 mt-1"
                              style={{cursor:"pointer"}}
                            >
                              <i className="ni ni-delivery-fast" />
                            </span>
                          </InputGroup>
                        </FormGroup>
                        <Popover
                          placement="top"
                          isOpen={this.state.freightPopOver}
                          hideArrow={true}
                          target="freightPopOverBtn"
                          style={{width: "300px"}}
                          toggle={() => this.toggleComponent("freightPopOver")}
                        >
                          <h4 className="ml-3 mt-2">Freight Charges</h4>
                          <span
                            className="text-primary"
                            style={{cursor: "pointer", position:"fixed", top: 7, right: 12}}
                            onClick={() => this.toggleComponent("freightPopOver")}
                          >
                            <i className="fa fa-times" />
                          </span>
                          <PopoverBody>
                            {this.state.freightTotal > 0 || this.state.freightTotalFC > 0 ?
                              <Table size="sm" className="ml-0 mt--2 mb-0 mr--1 table-sm">
                                <thead style={{backgroundColor: "#8e7ef324"}}>
                                  <tr>
                                    <th scope="col">#</th>
                                    <th scope="col">Freight Name</th>
                                    <th scope="col">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(Array.isArray(this.state.freightInfoForDraft) && this.state.freightInfoForDraft.length > 0) ? (
                                    this.state.freightInfoForDraft.map((item, key) => {
                                      return (
                                        <tr key={item.ExpenseCode} id={"trId"+key}>
                                          <td>{key+1}</td>
                                          <td>{item.FreightName}</td>
                                          <td>
                                            {currency === systemCurrency ? item.LineTotal
                                              : item.LineTotalFC
                                            }
                                          </td>
                                        </tr>
                                      )
                                    })
                                  ) : null}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td></td>
                                    <td><h4>Freight Total</h4></td>
                                    <td><h4>
                                      {currency === systemCurrency ? this.state.freightTotal
                                        : this.state.freightTotalFC}
                                    </h4></td>
                                  </tr>
                                </tfoot>
                              </Table>
                              : <h5 className="text-warning"> Not Available</h5>
                            }
                          </PopoverBody>
                        </Popover>
                      </Col> */}
                    <Col sm="6" md="3">
                      <small className="text-muted">Total Payment Due</small>
                      <h4 className="mt-1">
                        {currency} {docTotal}
                      </h4>
                    </Col>
                    {/* <Col sm="6" md="2">
                        <small className="text-muted">Tax</small>
                        <FormGroup className="mt-1">
                          <Input
                            bsSize="sm"
                            // style={{ width: 55 + "%" }}
                            value={this.state.customerRefNo}
                            //NOTE: Added "display-4 text-gray-dark" to change the size and color of the Textbox font
                            className={"form-control display-4 text-gray-dark " + this.state.inValidInput}
                            id="input-customer-ref-no"
                            placeholder="Tax"
                            type="text"
                            onChange={(e) => this.handleCustomerRefNoChange(e.target.value)}
                          />
                        </FormGroup>
                      </Col> */}
                  </Row>
                </Card>

                {/* Item Details */}
                <Row className="align-items-center">
                  <Col xs="5">
                    <h6 className="heading-small text-muted mb-4">Item Details</h6>
                  </Col>
                </Row>
                <Card className="mt--2 shadow-xl">
                  {" "}
                  {/**  */}
                  <CardBody>
                    {" "}
                    {/** className="pl-lg--4" - DIDN'T Work: Added to reduce the left space b/w table n Card*/}
                    <Table size="sm" className="align-items-center table-flush" responsive>
                      {/** ml-lg--2 - DIDN'T Work: Added to reduce the left space b/w table n Card*/}
                      <thead className="thead-light">
                        <tr>
                          {itemsTableHead.map((headerCol, key) => {
                            return (
                              //(key == 0) ? : //let the 1st Header column be aligned "left" & the rest use "center" alignment
                              <th scope="col" key={headerCol}>
                                {headerCol}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(itemsList) && itemsList.length > 0
                          ? itemsList.map((item, key) => {
                              return (
                                <>
                                  <tr key={item.ItemCode} id={"trId" + key}>
                                    <td>{item.LineNum + 1}</td>
                                    <td>{item.ItemCode}</td>
                                    <th scope="row" style={{ whiteSpace: "unset" }}>
                                      {item.ItemName}
                                    </th>
                                    <td>{item.Quantity}</td>
                                    <td>{item.WhsCode}</td>
                                    {/* <td>{item.LocationName}</td>
                                    <td>{item.BinCode}</td> */}
                                    <td>{item.InvntryUom}</td>
                                  </tr>

                                  {Array.isArray(item.BatchNumbers) && item.BatchNumbers.length > 0
                                    ? item.BatchNumbers.map((batch, key) => {
                                        return (
                                          <>
                                            {key === 0 ? (
                                              <tr key={0} style={{ backgroundColor: "#f6f8f9" }}>
                                                {/** fd737314 mild Orange*/}
                                                <td style={{ backgroundColor: "#fff" }}></td>
                                                <td>
                                                  <b>Batch#</b>
                                                </td>
                                                <td>
                                                  <b>Quantity</b>
                                                </td>
                                              </tr>
                                            ) : null}
                                            <tr
                                              key={
                                                batch.BatchNumberProperty
                                                  ? batch.BatchNumberProperty
                                                  : batch.BatchNumber
                                              }
                                            >
                                              <td></td>
                                              <td>
                                                {batch.BatchNumberProperty
                                                  ? batch.BatchNumberProperty
                                                  : batch.BatchNumber}
                                              </td>
                                              <td>{batch.Quantity}</td>
                                            </tr>
                                          </>
                                        );
                                      })
                                    : null}
                                  {Array.isArray(item.SerialNumbers) &&
                                  item.SerialNumbers.length > 0
                                    ? item.SerialNumbers.map((batch, key) => {
                                        return (
                                          <>
                                            {key === 0 ? (
                                              <tr key={0} style={{ backgroundColor: "#f6f8f9" }}>
                                                <td style={{ backgroundColor: "#fff" }}></td>
                                                <td>
                                                  <b>Serial#</b>
                                                </td>
                                                <td>
                                                  <b>Quantity</b>
                                                </td>
                                              </tr>
                                            ) : null}
                                            <tr key={batch.InternalSerialNumber}>
                                              <td></td>
                                              <td>{batch.InternalSerialNumber}</td>
                                              <td>{batch.Quantity}</td>
                                            </tr>
                                          </>
                                        );
                                      })
                                    : null}
                                </>
                              );
                            })
                          : null}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </CardBody>
            </Card>
          </Col>
        </Row>
        {/** Popup */}
        <Modal
          //size="sm" //if this prop is not set then the Modal size will be 'medium'
          className="modal-dialog-centered"
          isOpen={this.state.rejectReasonPopup}
          toggle={() => this.toggleModal("rejectReasonPopup")}
          backdrop={"static"} //true - clicking outside the Modal will close the Modal.
          //       Modal will have a gray transparent bg
          //false - Modal doesn't close when clicking outside, but the bg will be transparent
          //'static' - Modal doesn't close when clicking outside & it will have a gray bg too
          keyboard={false} //true - pressing Esc button in the Keyboard will close the Modal
          //style={{height: 500+"px", overflow: "auto"}}
        >
          <div className="modal-header mb--3">
            <h3 className="mt-0">Reason for Rejection</h3>
            <span className="mb-3">
              {this.state.popupWarningMsg && (
                <span className="text-warning mr-20 small">
                  <i className="fa fa-exclamation-triangle" /> &nbsp;
                  {this.state.popupWarningMsg}
                </span>
              )}
            </span>
          </div>
          <div className="modal-body mt--4">
            <FormGroup className="mb-0">
              <Input
                bsSize="sm"
                rows="4"
                type="textarea"
                value={this.state.rejectReason}
                className="form-control display-4 text-gray-dark"
                id="input-customer-rejectReason"
                placeholder="Enter a Reason"
                onChange={(e) => this.setState({ rejectReason: e.target.value })}
              />
            </FormGroup>
          </div>
          <div className="modal-footer mt--4">
            <Button
              size="sm"
              color="primary"
              type="button"
              onClick={this.handleApproval(requestStatus.REJECTED)}
            >
              Submit
            </Button>
            <Button
              size="sm"
              //className="ml-auto" //this will move the 'Save' button to the left side of the modal
              color="danger" //"link"
              data-dismiss="modal"
              type="button"
              onClick={() => this.closePopup()}
            >
              Cancel
            </Button>
          </div>
        </Modal>

        {this.state.successMsg ? (
          <ToastMessage type={statusColors.SUCCESS} message={this.state.successMsg} />
        ) : this.state.warningMsg ? (
          <ToastMessage type={statusColors.WARNING} message={this.state.warningMsg} />
        ) : null}
      </>
    );
  }
}
export default ItemDetails;

ItemDetails.propTypes = {
  operation: PropTypes.string.isRequired,
  //selectedRecord: PropTypes.object.isRequired,
  //setGRPODraftDetails: PropTypes.func.isRequired
};
