import React, { useEffect, useState } from "react";
import classnames from "classnames";
import {
  FormGroup,
  Card,
  CardHeader,
  CardTitle,
  Row,
  Col,
  Spinner,
  Label,
  Input,
  InputGroupAddon,
  InputGroupText,
  InputGroup,
  Collapse,
  Alert,
} from "reactstrap";
import { ChevronDown, ChevronUp, AlertCircle } from "react-feather";
import DatePicker from "../../components/DatePicker.js"; // Adjust the import path as needed
import DebouncedInput from "../../components/DebouncedInput";
import DropDownComponent from "../components/DropDownComponent";
import CustomerAutoComplete from "../components/AutoComplete/CustomerAutoComplete";
import SalesEmployeeDropdown from "../components/SalesEmployeeDropdown.js";
import RecordStatusDropdown from "../../components/RecordStatusDropdown.js";
import DisplayMessage from "../../components/DisplayMessage.js";

import { statusColors } from "../../config/config.js";

const FilterCard = ({
  filters,
  recordType,
  setFilters,
  isLoading,
  enableCustomerSearch = true,
  enableLocationBasedSearch = true,
  placeholder = "Search",
}) => {
  //getRecords, setRecords
  const [collapse, setCollapse] = useState(true);
  // const [isLoading, setIsLoading] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  // Helper to check if a date is already in YYYY-MM-DD format
  const isYYYYMMDD = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);

  // One-time normalization of initial filter dates to YYYY-MM-DD
  useEffect(() => {
    if (filters) {
      let changed = false;
      const newFilters = { ...filters };
      if (filters.fromDate && !isYYYYMMDD(filters.fromDate)) {
        newFilters.fromDate = formatDateLocal(filters.fromDate);
        changed = true;
      }
      if (filters.toDate && !isYYYYMMDD(filters.toDate)) {
        newFilters.toDate = formatDateLocal(filters.toDate);
        changed = true;
      }
      if (changed) setFilters(newFilters);
    }
  }, []);

  // Helper to format date as YYYY-MM-DD
  const formatDateLocal = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toggleCollapse = () => {
    setCollapse(!collapse);
  };

  const handleChange = (event) => {
    setWarningMsg("");
    const { name, value } = event.target;
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    // Call getData() function here if needed
  };

  const handleDateChange = (name, date) => {
    setWarningMsg("");
    // Always store as YYYY-MM-DD string
    let formatted = "";
    if (date) {
      if (typeof date === "string" && isYYYYMMDD(date)) {
        formatted = date;
      } else {
        formatted = formatDateLocal(date);
      }
    }
    setFilters((prevState) => ({
      ...prevState,
      [name]: formatted,
    }));
  };

  const handleLocationChange = (propName, locationCode, locationName) => {
    setWarningMsg("");
    console.log("handleLocationChange: ", propName, " - ", locationName, " - ", locationCode);
    setFilters({ ...filters, locationName });
  };

  const handleSearch = (value) => {
    setWarningMsg("");
    // Reset `docStatus` when a Global search is performed
    if (value) {
      setFilters({ ...filters, docStatus: "-", searchKey: value });
    }
    // Set the default search values when the searchKey is cleared
    else {
      setFilters({ ...filters, docStatus: "", searchKey: "" });
    }
  };

  const handleCustomerSelection = (selectedCustomer) => {
    console.log("Selected Customer: ", JSON.stringify(selectedCustomer));
    setWarningMsg("");
    if (selectedCustomer) {
      setFilters({ ...filters, cardCode: selectedCustomer.CardCode }); //selectedCustomer.CardName
    } else {
      setFilters({ ...filters, cardCode: "" });
    }
  };

  const handleSalesEmployeeSelection = (propName, salesEmployeeCode) => {
    console.log("Selected Sales Employee: ", propName, " - ", salesEmployeeCode);
    setWarningMsg("");
    setFilters({ ...filters, salesEmployeeCode });
  };

  // This will be taken care in the `Table` comp.
  // useEffect(() => {
  //   const fetchData = async () => {
  //     setIsLoading(true);
  //     try {
  //       const records = await getRecords(filters);
  //       setRecords(records);
  //     }
  //     catch(err) {
  //       setWarningMsg(err.response?.message);
  //     }
  //     finally {
  //       setIsLoading(false);
  //     }
  //   }
  //   fetchData();

  // }, [filters.fromDate, filters.toDate, filters.docStatus, filters.cardCode,
  // filters.locationName, filters.searchKey]);

  // Block rendering until dates are normalized
  if (
    (filters.fromDate && !isYYYYMMDD(filters.fromDate)) ||
    (filters.toDate && !isYYYYMMDD(filters.toDate))
  ) {
    return null; // or a spinner if you prefer
  }

  return (
    <>
      <Card className="bg-white shadow mb-2 pb-3">
        <CardHeader className="border-0 mb--4 mt--2">
          <Row className="align-items-center mt--1">
            <Col sm="3" md="4">
              <h3>Filter {recordType ? ` ${recordType}` : ""}</h3>
            </Col>
            <Col sm="6" md="5">
              {warningMsg && (
                <DisplayMessage type={statusColors.WARNING} iconSize={"sm"} message={warningMsg} />
              )}
            </Col>
            <Col sm="2" className="ml-0 text-right">
              {isLoading && (
                <>
                  <Spinner color="primary" className="reload-spinner" />
                  <small className="mt-1 mb-3 ml-3 text-primary">Processing...</small>
                </>
              )}
            </Col>
            <Col xs="1" className="ml-0 text-right">
              {!collapse ? (
                <ChevronDown
                  className="text-primary cursor-pointer"
                  style={{ marginTop: "-15px" }}
                  size={16}
                  onClick={toggleCollapse}
                />
              ) : (
                <ChevronUp
                  className="cursor-pointer"
                  style={{ marginTop: "-15px" }}
                  size={16}
                  onClick={toggleCollapse}
                />
              )}
            </Col>
          </Row>
        </CardHeader>
        <Collapse isOpen={collapse}>
          <div style={{ padding: "0 20px 0" }}>
            <Row>
              {enableCustomerSearch && (
                <Col md="3" sm="6">
                  <small className="text-muted">Customer</small>
                  <FormGroup className="mt-1">
                    <CustomerAutoComplete
                      size="sm"
                      allowNew={false}
                      handleSelection={handleCustomerSelection}
                      placeholder={"Enter Customer Name or Code"}
                    />
                  </FormGroup>
                </Col>
              )}
              <Col md="3" sm="6">
                <SalesEmployeeDropdown
                  label={"Sales Employee"}
                  propName={"salesEmployeeCode"}
                  value={filters.salesEmployeeCode}
                  handleChange={handleSalesEmployeeSelection}
                  storeLocation={filters.locationName}
                  userCode={filters.userCode}
                />
              </Col>
              <Col md="3" sm="6">
                <small className="text-muted">From Date</small>
                <DatePicker
                  value={
                    filters.fromDate && isYYYYMMDD(filters.fromDate)
                      ? filters.fromDate
                      : filters.fromDate
                        ? formatDateLocal(filters.fromDate)
                        : ""
                  }
                  handleChange={(date) => handleDateChange("fromDate", date)}
                  isValidDate={(currentDate) => currentDate.isBefore(new Date())}
                />
              </Col>
              <Col md="3" sm="6">
                <small className="text-muted">To Date</small>
                <DatePicker
                  value={
                    filters.toDate && isYYYYMMDD(filters.toDate)
                      ? filters.toDate
                      : filters.toDate
                        ? formatDateLocal(filters.toDate)
                        : ""
                  }
                  handleChange={(date) => handleDateChange("toDate", date)}
                  isValidDate={(currentDate) => {
                    // Convert to Date objects for comparison
                    const fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Remove time for comparison
                    const curr = new Date(currentDate);
                    curr.setHours(0, 0, 0, 0);
                    // Allow selecting same date as fromDate, not after today, not before fromDate
                    return (
                      (!fromDate || curr.getTime() >= fromDate.getTime()) &&
                      curr.getTime() <= today.getTime()
                    );
                  }}
                />
              </Col>
              {enableLocationBasedSearch ? (
                <Col md="3" sm="6">
                  <DropDownComponent
                    label={"Location"}
                    recordType={"Location"}
                    bindField={"Location"}
                    showField={"Location"}
                    module={"STORELOCATION"}
                    propName={"location"}
                    value={filters.locationName}
                    handleChange={handleLocationChange}
                    disabled={false}
                  />
                </Col>
              ) : (
                <Col md="3" sm="6">
                  <small className="text-muted">Location</small>
                  <div className="form-control form-control-sm mt-1 pt-1 display-4 text-dark">
                    {filters.locationName}
                  </div>
                </Col>
              )}
              <Col md="3" sm="6">
                <RecordStatusDropdown
                  name="docStatus"
                  value={filters.docStatus}
                  handleChange={handleChange}
                />
              </Col>
              <Col sm="6" md="6">
                <small className="text-muted">Search</small>
                <FormGroup className={classnames({ focused: false })}>
                  <InputGroup className="mb--4 ml-0 mt-1" size="sm">
                    {/* <InputGroupAddon addonType="prepend">
                      <InputGroupText>
                        <i className="ni ni-zoom-split-in" />
                      </InputGroupText>
                    </InputGroupAddon> */}
                    <DebouncedInput
                      icon="ni ni-zoom-split-in text-muted"
                      iconSize="sm"
                      addonType="prepend"
                      bsSize="sm"
                      id="searchKey"
                      className={"form-control"} // display-4 text-gray-dark
                      placeholder={placeholder}
                      onChange={handleSearch}
                      delayInMilliseconds={700}
                      readOnly={false}
                    />
                  </InputGroup>
                </FormGroup>
              </Col>
            </Row>
          </div>
        </Collapse>
      </Card>
    </>
  );
};

export default FilterCard;
