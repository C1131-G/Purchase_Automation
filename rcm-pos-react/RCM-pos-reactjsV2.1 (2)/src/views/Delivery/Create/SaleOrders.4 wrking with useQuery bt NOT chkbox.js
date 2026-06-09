import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

const SaleOrders = (props) => {
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");
  const [selectMultipleBaseRecords, setSelectMultipleBaseRecords] = useState(false);
  const [vendorList, setVendorList] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedVendorAllRecs, setSelectedVendorAllRecs] = useState([]);
  const [selectedVendorFilteredRecs, setSelectedVendorFilteredRecs] = useState([]);
  const [selectedBaseRecords, setSelectedBaseRecords] = useState([]);
  const [branchId, setBranchId] = useState(isMultiBranchEnabled ? "" : 1);
  const [searchAltFocused, setSearchAltFocused] = useState(false);

  /**
   * Filters Recs based on the selected Vendor in the dropdown
   * @param {Event} _event
   */
  const handleVendorChange = (_selectedVendor) => {
    let selectedVendorAllRecs = [];
    if (_selectedVendor && _selectedVendor.value) {
      const selectedVendorName = _selectedVendor.value;
      console.log("_selectedVendor: " + JSON.stringify(_selectedVendor));

      if (selectedVendorName) {
        selectedVendorAllRecs = allRecords.filter((rec) => {
          return rec.CardName === selectedVendorName;
        });
      }
    }
    setSelectedVendor(_selectedVendor);
    setSelectedVendorAllRecs(selectedVendorAllRecs);
    setSelectedVendorFilteredRecs(selectedVendorAllRecs);
  };

  /**
   * Loads the Vendor dropdown with vendor names to 'Create Target Rec from multiple Base Recs'
   * checkbox is checked
   * @param {Event} _event
   */
  const handleMultipleBaseRecsCheckboxChange = (_event) => {
    const checked = _event.target.checked;
    if (checked) {
      let vendorList = [],
        vendorNamesList = [];
      allRecords.forEach((rec) => {
        if (!vendorNamesList.includes(rec.CardName)) {
          vendorNamesList.push(rec.CardName);
          // vendorList.push({ value: rec.CardName, label: rec.CardName });
        }
      });
      vendorNamesList.forEach((vendor) => {
        vendorList.push({ value: vendor, label: vendor });
      });
      setVendorList(vendorList);
    }
    setSelectMultipleBaseRecords(checked);
  };

  /**
   * Adds/Removes Recs from the 'selectedBaseRecords' list, which will be sent to the next tab
   * @param {*} _event
   * @param {*} _selectedItem
   */
  const handleBaseRecordSelection = (_event, _selectedItem) => {
    let updatedVendorAllRecs = cloneDeep(selectedVendorAllRecs);
    let updatedVendorFilteredRecs = cloneDeep(selectedVendorFilteredRecs);
    let updatedBaseRecords = cloneDeep(selectedBaseRecords);
    let isSelected = _event.target.checked;

    updatedVendorAllRecs.forEach((rec) => {
      if (rec.DocNum === _selectedItem.DocNum) {
        rec.isSelected = isSelected;
      }
    });

    updatedVendorFilteredRecs.forEach((rec) => {
      if (rec.DocNum === _selectedItem.DocNum) {
        rec.isSelected = isSelected;
      }
    });

    if (isSelected) {
      updatedBaseRecords.push(_selectedItem);
    } else {
      //remove the selected item from the list when the checkbox is unchecked
      for (let i = updatedBaseRecords.length - 1; i >= 0; i--) {
        if (updatedBaseRecords[i].DocNum === _selectedItem.DocNum) {
          updatedBaseRecords.splice(i, 1);
          break;
        }
      }
    }
    console.log("handleBaseRecordSelection- selectedBaseRecords: " + updatedBaseRecords.toString());

    setSelectedVendorAllRecs(updatedVendorAllRecs);
    setSelectedVendorFilteredRecs(updatedVendorFilteredRecs);
    setSelectedBaseRecords(updatedBaseRecords);
  };

  /**
   * Send the selected Recs to the parent component, from where it will be sent to next tab
   */
  const handleNext = () => {
    // const selectedBaseRecords = [...selectedBaseRecords];
    props.setSelectedBaseRecordDetails(selectedBaseRecords);
    //clean up the selection after sending the 'selectedBaseRecords' to the parent Comp.
    setSelectMultipleBaseRecords(false);
    setSelectedVendor("");
    setSelectedVendorAllRecs([]);
    setSelectedVendorFilteredRecs([]);
    setSelectedBaseRecords([]);
  };

  /**
   * Callback func. to be executed from <BranchDropdown>
   */
  const handleBranchChange = async (_branchId) => {
    console.log("handleBranchChange: " + _branchId);
    if (_branchId) {
      setWarningMsg("");
      setBranchId(_branchId);

      //NOTE: This is NOT REQUIRED, in fact, this actually causes unnecessary api calls on branch change
      //even if a branch's recs. are already there in the cache

      //Setting `enabled` to `!!branchId` in useQuery() just does the job
      //It triggers the query whenever branch changes & no api call is made if a branch's data is already
      //available in cache

      //Execute the saleOrderQuery manually, only when 'branchId' changes
      // saleOrderQuery.refetch();
      // await getRecords(_branchId);
    } else {
      setBranchId("");
      setAllRecords([]);
      setFilteredRecords([]);
      setWarningMsg("Select a branch to continue");
    }
  };

  /**
   * Filters Sale/Purchase Orders based on the 'searchKey' and returns the matching records.
   * @param {String} _searchKey Sale/Purchase Order number or Vendor Name
   */
  const searchRecords = (_searchKey) => {
    //console.log(`Index - searchRecords - ${_searchKey}`);
    let recordsToFilter = [],
      filteredRecords = [];

    //Search through 'selectedVendorAllRecs' list instead of 'recordsToFilter' when Multi-Base Records is enabled
    if (selectMultipleBaseRecords) {
      recordsToFilter = selectedVendorAllRecs;
    } else {
      recordsToFilter = allRecords;
    }

    //if the _searchKey is Not a Number, change the it to Upper case to make the search 'case insensitive'
    if (isNaN(_searchKey)) {
      _searchKey = _searchKey.toUpperCase();
    }

    recordsToFilter.forEach((rec) => {
      if (
        rec.DocNum.toString().indexOf(_searchKey) > -1 ||
        rec.CardName.toUpperCase().indexOf(_searchKey) > -1 ||
        rec.CardCode.toUpperCase().indexOf(_searchKey) > -1
      ) {
        //console.log(`for - ${rec.DocNum} - ${rec.CardName}`)
        filteredRecords.push(rec);
      }
    });

    //console.log(`filteredRecords: ${JSON.stringify(filteredRecords)}`);
    if (selectMultipleBaseRecords) {
      setSelectedVendorFilteredRecs(filteredRecords);
    } else {
      setFilteredRecords(filteredRecords);
    }
  };

  /**
   * Gets all 'open' Sale/Purchase Orders from API and sets them to state variables
   */
  const getRecords = async (_branchId) => {
    //const openOrderAPI = `SaleOrders?$select=DocNum,CardCode,CardName,DocDate,Comments&$filter=DocumentStatus eq 'bost_Open'`;
    try {
      let response = await getOpenSaleOrders(_branchId);
      console.log(`OpenSaleOrders response: ${JSON.stringify(response)}`);
      // if (Array.isArray(response) && response.length) {
      //   return response;
      // }
      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  };

  const saleOrderQuery = useQuery({
    queryKey: ["saleOrders", branchId],
    queryFn: async () => {
      if (branchId) {
        const records = await getOpenSaleOrders(branchId); //await getRecords(branchId);
        return records;
      } else {
        // throw new Error("Select a branch to continue");
        setWarningMsg("Select a branch to continue");
        return [];
      }
    },
    // Setting this to `false` will disable this query from automatically running. But here after setting
    // it to false, `refetch()` isnt triggering this query either. So had to use !!branchId, which
    // stops the query from executing automtically/initially & triggers it only when branch is changed

    //Enable the query only when a valid 'brachId' is set
    enabled: !!branchId, //double-negation is equivalent to -> branchId ? true : false
    staleTime: 1000 * 60 * 10, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

  // if (saleOrderQuery.isError) {
  //   console.log("saleOrderQuery.error: ", JSON.stringify(saleOrderQuery.error));
  //   setWarningMsg(saleOrderQuery.error.message);
  // }

  console.log("SaleOrder Query status: ", saleOrderQuery.status);
  // if(saleOrderQuery.onSuccess) {
  //Setting the query result to 'state' vars. here causes Infinite re-render error
  // setAllRecords(saleOrderQuery.data);
  // setFilteredRecords(saleOrderQuery.data);
  // }

  //componentDidUpdate - set the query results to state
  useEffect(() => {
    if (saleOrderQuery.status === "success") {
      setAllRecords(saleOrderQuery.data);
      setFilteredRecords(saleOrderQuery.data);
    }
  }, [saleOrderQuery.data]);

  useEffect(() => {
    if (saleOrderQuery.status === "error") {
      console.log("saleOrderQuery.error: ", JSON.stringify(saleOrderQuery.error));
      setWarningMsg(saleOrderQuery.error.message);
    }
  }, [saleOrderQuery.status]);

  useEffect(() => {
    if (selectMultipleBaseRecords) {
      if (!selectedVendorFilteredRecs.length) {
        setWarningMsg("Select a Vendor to proceed");
      }
    }
  }, [selectMultipleBaseRecords]);

  useEffect(() => {
    console.log("SaleOrders - useEffect");
    if (!warningMsg) {
      // setWarningMsg(warningMsg)
    }
  }, [warningMsg]);

  //Render
  const tableHeader = [
    "#",
    "Sale Order No.",
    "Document Date",
    "Vendor name",
    "Vendor Code",
    "Remarks",
  ];
  let filteredRecordsToRender = [];

  //Display selected Vendor's Sale Order list when 'Multiple Recs' checkbox is checked
  if (selectMultipleBaseRecords) {
    filteredRecordsToRender = selectedVendorFilteredRecs;
    tableHeader.unshift("Select");
  } else {
    filteredRecordsToRender = filteredRecords;
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
                    {
                      /* NOTE: with `saleOrderQuery.isLoading`, the spinner was alway spinning even before a Branch was
                       * selected as the query `status` was always in `loading` until it bcomes `success` or `error`.
                       * Replacing it with `isFetching` fixed the issue */
                      saleOrderQuery.isFetching ? (
                        <Spinner size="5" color="primary" className="reload-spinner" />
                      ) : null
                    }
                  </div>
                </Col>
                <Col sm="6" md="2" className="mt-md-3 mb-md--4 mt-sm-1 mb-sm--2">
                  <FormGroup
                    className={classnames({
                      focused: searchAltFocused,
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
                        onFocus={() => setSearchAltFocused(true)}
                        onBlur={() => setSearchAltFocused(false)}
                        onKeyUp={(e) => searchRecords(e.target.value)}
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
                      value={branchId}
                      handleChange={handleBranchChange}
                      // disabled={displayMode === displayModes.VIEW}
                    />
                  </Col>
                )}
                {/* {Array.isArray(allRecords) && allRecords.length ? */}
                {Array.isArray(filteredRecordsToRender) && filteredRecordsToRender.length > 0 ? (
                  <>
                    <Col sm="4" md="3" className="mb-sm-3 mb-md--2 ml-md-0 mt-md-2">
                      <CustomInput
                        inline
                        id="selectMultipleBaseRecords"
                        type="checkbox"
                        label="Create from Multiple records"
                        className="text-xs text-gray-dark" //display-4
                        checked={selectMultipleBaseRecords}
                        onChange={(e) => handleMultipleBaseRecsCheckboxChange(e)}
                        disabled={false}
                      />
                    </Col>
                    <Col md="5" className="mb-sm-3 mb-md--2 ml-md--4 mt-md-2">
                      {selectMultipleBaseRecords && (
                        <Select
                          styles={selectStyles}
                          closeMenuOnSelect={true}
                          isClearable={true}
                          //defaultValue={queueList[0]}
                          isMulti={false}
                          name="vendorList"
                          options={vendorList}
                          className="React"
                          classNamePrefix="select"
                          value={selectedVendor}
                          onChange={handleVendorChange}
                        />
                      )}
                    </Col>
                  </>
                ) : null}
                <Col md="1" className="mb-sm-3 mb-md--2 ml-md--3 mt-md-2">
                  {selectedBaseRecords.length > 0 && (
                    <Button
                      size="sm"
                      color="primary"
                      className="text-right"
                      onClick={() => handleNext()}
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
                    Array.isArray(filteredRecordsToRender) && filteredRecordsToRender.length ? (
                      filteredRecordsToRender.map((item, key) => {
                        return (
                          <tr key={`${item.DocNum}`}>
                            {selectMultipleBaseRecords && (
                              <td>
                                <CustomInput
                                  inline
                                  id={"selectedPO" + key}
                                  type="checkbox"
                                  label=""
                                  className="text-gray-dark" //display-4
                                  checked={item.isSelected}
                                  onChange={(e) => handleBaseRecordSelection(e, item)}
                                  disabled={false}
                                />
                              </td>
                            )}
                            <td>{key + 1}</td>
                            <th className="mb-0 text-sm" scope="row">
                              <a
                                style={{ cursor: "pointer", textDecoration: "underline" }}
                                //Send the Selected Base Record Details to parent component <CreateGRPO>
                                onClick={() => props.setSelectedBaseRecordDetails([item])}
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
                          {saleOrderQuery.isFetching ? (
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
};

export default SaleOrders;
