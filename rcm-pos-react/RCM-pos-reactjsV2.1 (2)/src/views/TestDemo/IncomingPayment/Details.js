import React from "react";
import PropTypes from "prop-types";
// react plugin used to create datetimepicker
import ReactDatetime from "react-datetime";
import moment from "moment";
import axios from "axios";
// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Input,
  InputGroup,
  Table,
  Row,
  Col,
  Modal,
  Spinner,
  Tooltip,
  Popover,
  PopoverHeader,
  PopoverBody,
} from "reactstrap";

import api from "../../../config/api-nodejs";
import { systemCurrency, displayModes, itemTypes } from "../../../config/config";

const today = ReactDatetime.moment(new Date());
class Details extends React.PureComponent {
  state = {
    displayMode: displayModes.CREATE,
    isLoading: false,
    warningMsg: "",
    successMsg: "",
    customerCardCode: "",
    donorType: "",
    natureOfDonation: "",
    under80G: "",
    premiumOrDiscount: "",
    paymentType: "",
    paymentDate: today,
    chequeNo: "",
    chequeDate: today,
    bankName: "",
    accountNo: "",
    currency: "",
    amount: "",
    exchangeRate: "",
    faceValue: "",
    bankCode: "IFSC",
    customerList: [
      { CardCode: "Donor1", CardName: "Donor ABC" },
      { CardCode: "Donor2", CardName: "Donor DEF" },
      { CardCode: "Donor3", CardName: "Donor HIJ" },
      { CardCode: "Donor4", CardName: "Donor XYZ" },
    ],
  };

  /** Disables future dates in the ReactDatetime component
   * @param {Moment Object} current We don't need to pass this argument, moment will automatically send it.
   * @returns "true" for the dates that match the given criteria- dates Before Today.
   */
  disableFutureDates = (current) => {
    return current.isBefore(today);
  };

  /** Check if the obj. passed is a valid Moment object before calling the format() funct.
   * This is to avoid the error that was thrown when user uses the keyboard to update the date
   */
  handleDateChange = (momentObj, name) => {
    if (moment.isMoment(momentObj)) this.setState({ [name]: momentObj.format("MMMM D, YYYY") });
    else {
      this.setState({ [name]: today });
    }
  };

  handleChange = (event) => {
    const { name, value } = event.target;
    this.setState({ [name]: value });
  };

  handleCreate = () => {
    this.setState({ displayMode: displayModes.CREATE });
    this.resetForm();
  };

  resetForm = () => {
    this.setState({
      customerCardCode: "",
      donorType: "",
      natureOfDonation: "",
      under80G: "",
      premiumOrDiscount: "",
      paymentType: "",
      paymentDate: today,
      chequeNo: "",
      chequeDate: today,
      bankName: "",
      accountNo: "",
      currency: "",
      amount: "",
      exchangeRate: "",
      faceValue: "",
    });
  };

  /**
   * Submits the Incoming Payment request to the API
   */
  submitRequest = async () => {
    this.setState({ isLoading: true, displayMode: displayModes.VIEW });
    const request = {
      DocType: "rCustomer",
      CardCode: this.state.customerCardCode,
      U_DonnerType: "Approvers",
      U_NatureofDonation: this.state.natureOfDonation,
      U_Under80G: this.state.under80G,
      U_PremiumORDiscount: this.state.premiumOrDiscount,
      PaymentType: "bopt_None",
      DocDate: this.state.paymentDate,
      // CashAccount: this.state.accountNo,
      CashAccount: "_SYS00000000524",
      // CheckAccount: null,
      // CheckSum: this.state.amount,
      DueDate: this.state.chequeDate,
      BankCode: this.state.bankCode,
      DocCurrency: this.state.currency,
      CashSum: this.state.amount,
      CashSumSys: this.state.amount,
      DocRate: this.state.exchangeRate,
      U_FaceValue: this.state.faceValue,
      BPLID: 1,
      DocObjectCode: "bopot_IncomingPayments",
      BillOfExchange: {},
    };
    console.log("request: " + JSON.stringify(request));
    try {
      let response = await api.post("service/incoming-payments", request); //?prefer=return-no-content

      //ERROR: Request from origin 'https://localhost:3001' has been blocked by CORS policy:
      // let response = await axios.post("https://10.0.0.4:50000/b1s/v1/IncomingPayments", request);
      console.log("submitRequest() - response: " + JSON.stringify(response.data));
      if (response.data.docNum) {
        this.setState({
          successMsg: `Incoming Donation# ${response.data.docNum} has been saved successfully!`,
          docNum: response.data.docNum,
        });
      }
    } catch (error) {
      /**
       * Sample error resp.
       * {
          "error": {
            "code": -4014,
            "message": {
                "lang": "en-us",
                "value": "Cannot add row without complete selection of batch/serial numbers"
            }
          }
        } */
      let warningMsg = "Unable to create Incoming Donation!";
      //console.log("submitRequest error: "+JSON.stringify(error.response));

      //To catch 401 error
      if (typeof error.response.data.message != "undefined") {
        warningMsg = error.response.data.message; //Error code: ${error.response.status}
      }
      //to catch error messages from Service Layer
      else if (typeof error.response.data.error.message != "undefined") {
        warningMsg = `Error code: ${error.response.data.error.code}. Message: ${error.response.data.error.message.value}`;
      } else if (typeof error.response.data.error != "undefined") {
        warningMsg = `Error: ${error.response.data.error}`;
      } else if (error.request) {
        warningMsg = error.request;
      } else if (error.message) {
        warningMsg = error.message;
      } else {
        warningMsg = JSON.stringify(error);
      }
      this.setState({
        warningMsg,
        displayMode: displayModes.CREATE,
      });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  async componentDidMount() {
    console.log("Details - componentDidMount");
  }

  render() {
    return (
      <>
        {/** Form */}
        <Row>
          <Col className="order-xl-1" xl="12">
            <Card className="bg-white shadow">
              {" "}
              {/** bg-secondary */}
              <CardHeader className="border-0 mb--4 mt--2">
                {" "}
                {/** bg-white */}
                <Row className="align-items-center mt--2">
                  <Col sm="4">
                    <h3 className="mb-0">Incoming Donation</h3>
                  </Col>
                  <Col className="text-right" xs="8">
                    {this.state.isLoading ? (
                      <>
                        <i className="fa fa-info-circle text-blue" /> &nbsp;
                        <small className="my-2 text-primary">
                          Please wait while we process your request &emsp;
                        </small>
                        <Spinner color="primary" className="reload-spinner" />
                      </>
                    ) : this.state.successMsg ? (
                      <span className="text-success mr-20 small">
                        <i className="fa fa-info-circle" /> &nbsp;
                        <span dangerouslySetInnerHTML={{ __html: this.state.successMsg }} />
                      </span>
                    ) : this.state.warningMsg ? (
                      <span className="text-warning mr-20 small">
                        <i className="fa fa-exclamation-triangle" /> &nbsp;
                        {this.state.warningMsg}
                      </span>
                    ) : null}
                    {!this.state.isLoading && this.state.displayMode === displayModes.CREATE && (
                      <>
                        <Button
                          color="primary"
                          className="ml-2"
                          // href="#"
                          //this.validateBeforeSumittingGRPO & () => this.validateBeforeSumittingGRPO() DIDN'T work
                          onClick={this.submitRequest}
                          size="sm"
                        >
                          Submit
                        </Button>
                        &nbsp;
                        <Button
                          color="danger"
                          // href="#"
                          onClick={this.resetForm}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {!this.state.isLoading && this.state.displayMode === displayModes.VIEW && (
                      <Button
                        color="primary"
                        className="ml-2"
                        // href="#"
                        //this.validateBeforeSumittingGRPO & () => this.validateBeforeSumittingGRPO() DIDN'T work
                        onClick={this.handleCreate}
                        size="sm"
                      >
                        Create New
                      </Button>
                    )}
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="mt--2">
                <h6 className="heading-small text-muted mb-3">Donor Details</h6>
                {/** <div className="pl-lg-3 pr-lg-3 mt--1 mb-2"> */}
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
                  {" "}
                  {/** text-center */}
                  <Row className="mt--2">
                    <Col md="3">
                      <small className="text-muted">Donor Name</small>
                      <div className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          id="customerCardCode"
                          name="customerCardCode"
                          type="select"
                          className={"form-control display-4 text-gray-dark "}
                          value={this.state.customerCardCode}
                          //style={{ width: "auto" }} //width: 100
                          onChange={(e) => this.handleChange(e)}
                          readOnly={this.state.displayMode === displayModes.VIEW}
                        >
                          <option value="">-- Select a Donor --</option>
                          {this.state.customerList.map((customer, key) => {
                            return (
                              <option key={customer.CardCode} value={customer.CardCode}>
                                {customer.CardName}
                              </option>
                            );
                          })}
                        </Input>
                      </div>
                    </Col>
                    <Col md="3">
                      <small className="text-muted">Donor Type</small>
                      <div className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          id="donorType"
                          name="donorType"
                          type="select"
                          className={"form-control display-4 text-gray-dark "}
                          value={this.state.donorType}
                          onChange={(e) => this.handleChange(e)}
                          readOnly={this.state.displayMode === displayModes.VIEW}
                        >
                          <option value="">-- Select a Donor Type --</option>
                          <option key={1} value={"1"}>
                            Type1
                          </option>
                        </Input>
                      </div>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Nature of Donation</small>
                      <FormGroup className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          type="input"
                          value={this.state.natureOfDonation}
                          className="form-control display-4 text-gray-dark"
                          id="natureOfDonation"
                          name="natureOfDonation"
                          placeholder="Enter Nature of Donation"
                          onChange={(e) => this.handleChange(e)}
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Under 80G</small>
                      <FormGroup className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          type="select"
                          value={this.state.under80G}
                          className="form-control display-4 text-gray-dark"
                          id="under80G"
                          name="under80G"
                          placeholder=""
                          onChange={(e) => this.handleChange(e)}
                        >
                          <option value="">-- Select an option --</option>
                          <option key={1} value={"Yes"}>
                            Yes
                          </option>
                          <option key={2} value={"No"}>
                            No
                          </option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Premium/Discount</small>
                      <FormGroup className="mt-1">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          value={this.state.premiumOrDiscount}
                          className={"form-control display-4 text-gray-dark "}
                          id="premiumOrDiscount"
                          name="premiumOrDiscount"
                          placeholder="Enter Premium/Discount"
                          type="number"
                          onChange={(e) => this.handleChange(e)}
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </Card>
                <h6 className="heading-small text-muted mb-3">Payment Details</h6>
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
                  <Row className="mt--1">
                    <Col md="3">
                      <small className="text-muted">Payment Type</small>
                      <div className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          id="paymentType"
                          name="paymentType"
                          type="select"
                          className={"form-control display-4 text-gray-dark "}
                          value={this.state.paymentType}
                          onChange={(e) => this.handleChange(e)}
                          readOnly={this.state.displayMode === displayModes.VIEW}
                        >
                          <option value="">-- Select a Payment Type --</option>
                          <option key={1} value={"Cheque"}>
                            Cheque
                          </option>
                          <option key={2} value={"Cash"}>
                            Cash
                          </option>
                        </Input>
                      </div>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Payment Date</small>
                      <FormGroup className="mt-1">
                        <InputGroup>
                          <i className="ni ni-calendar-grid-58 mt-1" />
                          <ReactDatetime
                            inputProps={{
                              className: "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                              readOnly: true,
                            }}
                            value={this.state.paymentDate}
                            onChange={(momentObj) =>
                              this.handleDateChange(momentObj, "paymentDate")
                            }
                            isValidDate={this.disableFutureDates}
                            timeFormat={false}
                            dateFormat={"MMMM D, YYYY"}
                            closeOnSelect={true}
                          />
                        </InputGroup>
                      </FormGroup>
                    </Col>
                    {(!this.state.paymentType || this.state.paymentType === "Cheque") && (
                      <>
                        <Col sm="6" md="3">
                          <small className="text-muted">Cheque No.</small>
                          <FormGroup className="mt-1 mb-3">
                            <Input
                              bsSize="sm"
                              readOnly={this.state.displayMode === displayModes.VIEW}
                              // rows="2"
                              type="input"
                              value={this.state.chequeNo}
                              className="form-control display-4 text-gray-dark"
                              id="chequeNo"
                              name="chequeNo"
                              placeholder="Enter Cheque No."
                              onChange={(e) => this.handleChange(e)}
                            />
                          </FormGroup>
                        </Col>
                        <Col sm="6" md="3">
                          <small className="text-muted">Cheque Date</small>
                          <FormGroup className="mt-1">
                            <InputGroup>
                              <i className="ni ni-calendar-grid-58 mt-1" />
                              <ReactDatetime
                                inputProps={{
                                  className:
                                    "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                                  readOnly: true,
                                }}
                                value={this.state.chequeDate}
                                onChange={(momentObj) =>
                                  this.handleDateChange(momentObj, "chequeDate")
                                }
                                isValidDate={this.disableFutureDates}
                                timeFormat={false}
                                dateFormat={"MMMM D, YYYY"}
                                closeOnSelect={true}
                              />
                            </InputGroup>
                          </FormGroup>
                        </Col>
                      </>
                    )}
                  </Row>
                  <Row>
                    <Col sm="6" md="3">
                      <small className="text-muted">Bank Code </small>
                      <h4 className="mt-1">{this.state.bankCode}</h4>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Bank Name</small>
                      <FormGroup className="mt-1">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          style={{ width: 100 + "%" }}
                          value={this.state.bankName}
                          className={"form-control display-4 text-gray-dark "}
                          id="bankName"
                          name="bankName"
                          placeholder="Enter Bank Name"
                          type="text"
                          onChange={(e) => this.handleChange(e)}
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Account No</small>
                      <FormGroup className="mt-1">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          style={{ width: 100 + "%" }}
                          value={this.state.accountNo}
                          className={"form-control display-4 text-gray-dark "}
                          id="accountNo"
                          name="accountNo"
                          placeholder="Enter Account No"
                          type="text"
                          onChange={(e) => this.handleChange(e)}
                        />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <small className="text-muted">Currency</small>
                      <div className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          id="currency"
                          name="currency"
                          type="select"
                          className={"form-control display-4 text-gray-dark "}
                          value={this.state.currency}
                          //style={{ width: "auto" }} //width: 100
                          onChange={(e) => this.handleChange(e)}
                          readOnly={this.state.displayMode === displayModes.VIEW}
                        >
                          <option value="">-- Select a currency --</option>
                          <option key={1} value={"INR"}>
                            INR
                          </option>
                          <option key={2} value={"EURO"}>
                            EURO
                          </option>
                          <option key={3} value={"USD"}>
                            USD
                          </option>
                        </Input>
                      </div>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Amount</small>
                      <FormGroup className="mt-1">
                        {/* {this.state.currency} */}
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          value={this.state.amount}
                          className={"form-control display-4 text-gray-dark "}
                          id="amount"
                          name="amount"
                          placeholder="Enter Amount"
                          type="number"
                          onChange={(e) => this.handleChange(e)}
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Exchange Rate</small>
                      <FormGroup className="mt-1">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          value={this.state.exchangeRate}
                          className={"form-control display-4 text-gray-dark "}
                          id="exchangeRate"
                          name="exchangeRate"
                          placeholder="Enter Exchange Rate"
                          type="number"
                          onChange={(e) => this.handleChange(e)}
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Face Value</small>
                      <FormGroup className="mt-1">
                        {/* {this.state.currency} */}
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          value={this.state.faceValue}
                          className={"form-control display-4 text-gray-dark "}
                          id="faceValue"
                          name="faceValue"
                          placeholder="Enter Face Value"
                          type="number"
                          onChange={(e) => this.handleChange(e)}
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </Card>
                {/** <hr className="my-2" /> */}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </>
    );
  }
}
export default Details;

Details.propTypes = {};
