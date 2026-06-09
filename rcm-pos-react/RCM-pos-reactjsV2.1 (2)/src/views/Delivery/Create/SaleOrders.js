import React from "react";
// node.js library that concatenates classes (strings)
import classnames from "classnames";
import PropTypes from "prop-types";
// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  FormGroup,
  Input,
  InputGroupAddon,
  InputGroupText,
  InputGroup,
  Table,
  Row,
  Col,
  Spinner,
  CustomInput,
} from "reactstrap";
import Select from "react-select";
import cloneDeep from "lodash.clonedeep";
import FavouriteButton from "../../../components/FavouriteButton";

import { getOpenSaleOrders } from "../../../helper/sale-order";
import api from "../../../config/api-nodejs";
import { showWarningMsg, formatDate } from "../../../config/util.js";
import { isMultiBranchEnabled } from "../../../config/config";
import BranchDropdown from "../../components/BranchDropdown";
import CustomerDropdown from "../../components/CustomerDropdown";
// import "./fixed-header.scss";

/**Below "style" is to remove the default "blue" color bg of "option"
 * Once this is removed, custom style from "_react-select.scss" will be used
 */
const selectStyles = {
  menu: (currentStyles) => ({
    ...currentStyles,
    width: "80%", //for Menu Items
  }),
  control: (currentStyles) => ({
    // passing in react-select's current styles
    ...currentStyles,
    width: "80%", //for Dropdown
    fontSize: "0.86rem",
    //borderColor: "#4e5154"
  }),
  option: (currentStyles, state) => ({
    ...currentStyles,
    //color: state.isSelected ? "red" : "blue",
    backgroundColor: null,
    // width: "80%",
    fontSize: "0.85rem",
    //zIndex: 999 //Didnt work!
  }),
};

class SaleOrders extends React.Component {
  state = {
    allRecords: [],
    filteredRecords: [],
    warningMsg: "",
    selectMultipleBaseRecords: false,
    customerList: [],
    selectedCustomer: "",
    selectedCustomerAllRecs: [],
    selectedCustomerFilteredRecs: [],
    selectedBaseRecords: [],
    isLoading: false,
    branchId: isMultiBranchEnabled ? "" : 1,
  };

  /**
   * Filters Recs based on the selected Customer in the dropdown
   * @param {Event} event
   */
  handleCustomerChange = (selectedCustomer) => {
    // const selectedCustomer = event.target.value;
    let selectedCustomerAllRecs = [];
    if (selectedCustomer && selectedCustomer.value) {
      const selectedCustomerName = selectedCustomer.value;
      console.log("selectedCustomer: " + JSON.stringify(selectedCustomer));

      if (selectedCustomerName) {
        selectedCustomerAllRecs = this.state.allRecords.filter((rec) => {
          return rec.CardName === selectedCustomerName;
        });
      }
    }
    this.setState({
      selectedCustomer,
      selectedCustomerAllRecs,
      selectedCustomerFilteredRecs: selectedCustomerAllRecs,
    });
  };

  /**
   * Loads the Customer dropdown with customer names to 'Create Target Rec from multiple Base Recs'
   * checkbox is checked
   * @param {Event} event
   * @param {String} name 'state' variable name
   */
  handleMultipleBaseRecsCheckboxChange = (event, name) => {
    const checked = event.target.checked;
    if (checked) {
      let customerList = [],
        customerNamesList = [];
      this.state.allRecords.forEach((rec) => {
        if (!customerNamesList.includes(rec.CardName)) {
          customerNamesList.push(rec.CardName);
          // customerList.push({ value: rec.CardName, label: rec.CardName });
        }
      });
      customerNamesList.forEach((customer) => {
        customerList.push({ value: customer, label: customer });
      });
      //sort the customerList (in asc order) based on Customer Name
      //NOTE: This DIDN't WORK. Need to Debug and see whats happening inside sort()
      /*customerList = customerList.sort((a, b) => {
        if (a.CardName && b.CardName && isNaN(a.CardName) && isNaN(b.CardName)) {
          const valueA = a.CardName.toUpperCase();
          const valueB = b.CardName.toUpperCase();
          if (valueA < valueB) {
            return -1;
          }
          if (valueA > valueB) {
            return 1;
          }
          //names are equal
          return 0;
  
        }
        else {
          return a.CardName - b.CardName;
        }
      });*/

      this.setState({
        [name]: checked,
        customerList,
      });
    } else {
      this.setState({ [name]: checked });
    }
  };

  /**
   * Adds/Removes Recs from the 'selectedBaseRecords' list, which will be sent to the next tab
   * @param {*} event
   * @param {*} selectedItem
   */
  handleBaseRecordSelection = (event, selectedItem) => {
    let selectedCustomerAllRecs = cloneDeep(this.state.selectedCustomerAllRecs);
    let selectedCustomerFilteredRecs = cloneDeep(this.state.selectedCustomerFilteredRecs);
    let selectedBaseRecords = cloneDeep(this.state.selectedBaseRecords);
    let isSelected = event.target.checked;

    selectedCustomerAllRecs.forEach((rec) => {
      if (rec.DocNum === selectedItem.DocNum) {
        rec.isSelected = isSelected;
      }
    });
    selectedCustomerFilteredRecs.forEach((rec) => {
      if (rec.DocNum === selectedItem.DocNum) {
        rec.isSelected = isSelected;
      }
    });

    if (isSelected) {
      selectedBaseRecords.push(selectedItem);
    } else {
      //remove the selected item from the list when the checkbox is unchecked
      for (let i = selectedBaseRecords.length - 1; i >= 0; i--) {
        if (selectedBaseRecords[i].DocNum === selectedItem.DocNum) {
          selectedBaseRecords.splice(i, 1);
          break;
        }
      }
    }
    console.log(
      "handleBaseRecordSelection- selectedBaseRecords: " + selectedBaseRecords.toString(),
    );

    this.setState({
      selectedCustomerAllRecs,
      selectedCustomerFilteredRecs,
      selectedBaseRecords,
    });
  };

  /**
   * Send the selected Recs to the parent component, from where it will be sent to next tab
   */
  handleNext = () => {
    // const selectedBaseRecords = [...this.state.selectedBaseRecords];
    this.props.setSelectedBaseRecordDetails(this.state.selectedBaseRecords);
    //clean up the selection after sending the 'selectedBaseRecords' to the parent Comp.
    this.setState({
      selectMultipleBaseRecords: false,
      selectedCustomer: "",
      selectedCustomerAllRecs: [],
      selectedCustomerFilteredRecs: [],
      selectedBaseRecords: [],
    });
  };

  /**
   * Callback func. to be executed from <BranchDropdown>
   */
  handleBranchChange = async (branchId) => {
    this.setState({ isLoading: true });
    if (branchId) {
      console.log("handleBranchChange: " + branchId);
      await this.getRecords(branchId);
      this.setState({ branchId, isLoading: false, warningMsg: "" });
    } else {
      this.setState({
        branchId: "",
        allRecords: [],
        filteredRecords: [],
        isLoading: false,
        warningMsg: "Select a branch to continue",
      });
    }
  };

  /**
   * Gets all 'open' Sale/Purchase Orders from API and sets them to state variables
   */
  getRecords = async (branchId) => {
    if (!branchId) {
      branchId = this.state.branchId;
    }
    this.setState({ isLoading: true });
    console.log("Index - getRecords() - branchId: " + branchId);
    //const openOrderAPI = `SaleOrders?$select=DocNum,CardCode,CardName,DocDate,Comments&$filter=DocumentStatus eq 'bost_Open'`;
    try {
      let response = await getOpenSaleOrders(branchId);
      console.log(`OpenSaleOrders response: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        this.setState({
          allRecords: response,
          filteredRecords: response,
          isLoading: false,
        });
      }
    } catch (error) {
      if (error.response) {
        this.setState({
          warningMsg: error.response.data.message,
        });
      } else {
        this.setState({
          warningMsg: "Unable to connect to the server! Please contact your administrator",
        });
      }
    } finally {
      this.setState({
        isLoading: false,
      });
    }
  };

  /**
   * Filters Sale/Purchase Orders based on the 'searchKey' and returns the matching records.
   * @param {String} searchKey Sale/Purchase Order number or Customer Name
   */
  searchRecords = (searchKey) => {
    //console.log(`Index - searchRecords - ${searchKey}`);
    let allRecords = [],
      filteredRecords = [],
      filteredListStateVar;

    //Search through 'selectedCustomerAllRecs' list instead of 'allRecords' when Multi-Base Records is enabled
    if (this.state.selectMultipleBaseRecords) {
      allRecords = this.state.selectedCustomerAllRecs;
      filteredListStateVar = "selectedCustomerFilteredRecs";
    } else {
      allRecords = this.state.allRecords;
      filteredListStateVar = "filteredRecords";
    }

    //if the searchKey is Not a Number, change the it to Upper case to make the search 'case insensitive'
    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }

    allRecords.forEach((rec) => {
      if (
        rec.DocNum.toString().indexOf(searchKey) > -1 ||
        rec.CardName.toUpperCase().indexOf(searchKey) > -1 ||
        rec.CardCode.toUpperCase().indexOf(searchKey) > -1
      ) {
        //console.log(`for - ${rec.DocNum} - ${rec.CardName}`)
        filteredRecords.push(rec);
      }
    });
    //console.log(`filteredRecords: ${JSON.stringify(filteredRecords)}`);
    this.setState({ [filteredListStateVar]: filteredRecords });
  };

  componentDidMount = async () => {
    console.log("SaleOrders - componentDidMount");
    if (this.state.branchId) await this.getRecords();
    else {
      this.setState({ warningMsg: "Select a branch to continue" });
    }
  };

  render() {
    const tableHeader = [
      "#",
      "Sale Order No.",
      "Document Date",
      "Customer name",
      "Customer Code",
      "Remarks",
    ];
    const { allRecords } = this.state;
    let filteredRecords = [];
    let { warningMsg } = this.state;

    //Display selected Customer's Sale Order list when 'Multiple Recs' checkbox is checked
    if (this.state.selectMultipleBaseRecords) {
      filteredRecords = this.state.selectedCustomerFilteredRecs;
      if (!filteredRecords.length) {
        warningMsg = "Select a Customer to proceed";
      }
      tableHeader.unshift("Select");
    } else {
      filteredRecords = this.state.filteredRecords;
    }
    return (
      <>
        <Row>
          <Col className="mb-5 mb-xl-0" xl="12">
            <Card className="shadow">
              <CardHeader className="border-0 mb--1 mt--2">
                <Row className="align-items-center border-bottom mt--3">
                  <Col md="8">
                    <h3 className="mb-1.5">Open Sale Orders</h3>
                    <div className="mb-2">
                      <i className="fa fa-info-circle text-blue" /> &nbsp;
                      <small>
                        {isMultiBranchEnabled ? "Select a Branch. " : ""}
                        Select a Sale Order# to proceed
                      </small>
                    </div>
                  </Col>
                  <Col md="1">
                    <div className="mb-0 mt-3">
                      &emsp;
                      {this.state.isLoading ? (
                        <Spinner size="5" color="primary" className="reload-spinner" />
                      ) : null}
                    </div>
                  </Col>
                  <Col sm="6" md="2" className="mt-md-3 mb-md--4 mt-sm-1 mb-sm--2">
                    <FormGroup
                      className={classnames({
                        focused: this.state.searchAltFocused,
                      })}
                    >
                      <InputGroup className="input-group" size="sm">
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
                          onKeyUp={(e) => this.searchRecords(e.target.value)}
                        />
                      </InputGroup>
                    </FormGroup>
                  </Col>
                  <Col className="text-right mt-4 pt-1" md="1">
                    {/* <FavouriteButton /> */}
                  </Col>
                </Row>
                <Row>
                  {isMultiBranchEnabled && (
                    <Col sm="4" md="3" className="mb-sm-3 mb-md--2 ml-md-0 mt-md-1">
                      <BranchDropdown
                        label=""
                        value={this.state.branchId}
                        handleChange={this.handleBranchChange}
                        // disabled={this.state.displayMode === displayModes.VIEW}
                      />
                    </Col>
                  )}
                  {Array.isArray(allRecords) && allRecords.length ? (
                    <>
                      <Col sm="4" md="3" className="mb-sm-3 mb-md--2 ml-md-0 mt-md-2">
                        <CustomInput
                          inline
                          id="selectMultipleBaseRecords"
                          type="checkbox"
                          label="Create from Multiple records"
                          className="text-xs text-gray-dark" //display-4
                          checked={this.state.selectMultipleBaseRecords}
                          onChange={(e) =>
                            this.handleMultipleBaseRecsCheckboxChange(
                              e,
                              "selectMultipleBaseRecords",
                            )
                          }
                          disabled={false}
                        />
                      </Col>
                      <Col md="5" className="mb-sm-3 mb-md--2 ml-md--4 mt-md-2">
                        {this.state.selectMultipleBaseRecords && (
                          <Select
                            styles={selectStyles}
                            closeMenuOnSelect={true}
                            isClearable={true}
                            //defaultValue={this.state.queueList[0]}
                            isMulti={false}
                            name="customerList"
                            options={this.state.customerList}
                            className="React"
                            classNamePrefix="select"
                            value={this.state.selectedCustomer}
                            onChange={this.handleCustomerChange}
                          />
                        )}
                      </Col>
                    </>
                  ) : null}
                  <Col md="1" className="mb-sm-3 mb-md--2 ml-md--3 mt-md-2">
                    {this.state.selectedBaseRecords.length > 0 && (
                      <Button
                        size="sm"
                        color="primary"
                        className="text-right"
                        onClick={() => this.handleNext()}
                      >
                        Next
                      </Button>
                    )}
                  </Col>
                </Row>
              </CardHeader>
              <Card className="table-fixed-head table-fixed-head-lg">
                <Table size="sm" className="align-items-center table-flush" responsive>
                  {/** table-hover */}
                  <thead className="thead-light">
                    <tr>
                      {tableHeader.map((headerCol, key) => {
                        return (
                          //(key == 0) ? : //let the 1st Header column be aligned "left" & the rest use "center" alignment
                          <th scope="col" key={key}>
                            {headerCol}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {
                      Array.isArray(filteredRecords) && filteredRecords.length ? (
                        filteredRecords.map((item, key) => {
                          return (
                            <tr key={`${item.DocNum}`}>
                              {this.state.selectMultipleBaseRecords && (
                                <td>
                                  <CustomInput
                                    inline
                                    id={"selectedPO" + key}
                                    type="checkbox"
                                    label=""
                                    className="text-gray-dark" //display-4
                                    checked={item.isSelected}
                                    onChange={(e) => this.handleBaseRecordSelection(e, item)}
                                    disabled={false}
                                  />
                                </td>
                              )}
                              <td>{key + 1}</td>
                              <th className="mb-0 text-sm" scope="row">
                                <a
                                  style={{ cursor: "pointer", textDecoration: "underline" }}
                                  //Send the Selected Base Record Details to parent component <CreateGRPO>
                                  onClick={() => this.props.setSelectedBaseRecordDetails([item])}
                                >
                                  {item.DocNum}
                                </a>
                                {/** <i className="fas fa-arrow-up text-success mr-3" />{" "}**/}
                              </th>
                              <td>{formatDate(item.DocDate, "MMMM D, YYYY")}</td>
                              {/**<th className="mb-0 text-sm" scope="row">{item.CardName}</th>*/}
                              <td style={{ whiteSpace: "unset" }}>
                                <b>{item.CardName}</b>
                              </td>
                              <td>{item.CardCode}</td>
                              {/*** NOTE: added style={{whiteSpace: 'unset'}} - to word-wrap the cell content */}
                              <td style={{ width: "30%", whiteSpace: "unset" }}>{item.Comments}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          {/** Warning msg should span across the width of the table, so setting 'colSpan' with no. of columns */}
                          <td colSpan={tableHeader.length}>
                            {this.state.isLoading ? (
                              <span>{"Loading data please wait..."}</span>
                            ) : warningMsg ? (
                              showWarningMsg(warningMsg)
                            ) : (
                              showWarningMsg("No records found!")
                            )}
                          </td>
                        </tr>
                      )
                      /** This Alert didnt look good inside the Table..
                       * <Alert color="warning">{noOpenOrderMsg}</Alert>
                       **/
                    }
                  </tbody>
                </Table>
              </Card>
            </Card>
          </Col>
        </Row>
      </>
    );
  }
}

export default SaleOrders;

SaleOrders.propTypes = {
  setSelectedBaseRecordDetails: PropTypes.func.isRequired,
};
