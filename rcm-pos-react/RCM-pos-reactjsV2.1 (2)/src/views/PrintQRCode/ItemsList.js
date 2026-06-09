/** ItemsList.11 zz w NewWindow.js */
import React, { Suspense } from "react";
import ReactDatetime from "react-datetime";
import moment from "moment";
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
  Collapse,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  CustomInput,
  Popover,
  PopoverHeader,
  PopoverBody,
} from "reactstrap";
import { Trash2, X, PlusSquare } from "react-feather";
import { ChevronDown, ChevronUp, Edit } from "react-feather";
import FavouriteButton from "../../components/FavouriteButton";
import PreviewPrintQRCodes from "../components/PreviewPrintQRCodes";
import BinLocationDropdown from "../components/BinLocationDropdown";
import { toJpeg, toPng } from "html-to-image";

import api from "../../config/api-nodejs";
import { displayModes, itemTypeProperties } from "../../config/config.js";
import { showWarningMsg, getErrorMessageFromResponse } from "../../config/util.js";
import { getCustomerInfo } from "../../helper/customer";
import { portalModules, permissions } from "../../config/config";
import Header from "../../components/Headers/Header";

import {
  isMenuAddedToFavourites,
  addMenuToFavourites,
  removeMenuFromFavourites,
} from "../../util/favouritesMenu";
import { getBinsAndItemQtyForWarehouse } from "../../helper/bin-warehouse";
import { cloneDeep } from "lodash";

// import "./table-sort.scss";
// import"./fixed-header.scss";
// import "./print.css";

const getLastMonthDate = () => {
  const date = moment();
  return date.subtract(1, "month");
};

class ItemsList extends React.Component {
  ref = React.createRef();
  state = {
    operation: "",
    warehouse: "",
    warehouseList: [],
    moduleName: "",
    modulesList: [],
    usersList: [],
    allRequestList: [],
    filteredRequestList: [], //TODO: Need to search ALL th ecode that uses thsi var. & remove them
    batchSerialItemsList: [],
    filteredBatchSerialItemKeys: [],
    sort: {
      column: null,
      direction: "desc",
    },
    recordStatus: "ALL",
    count: 0,
    invalidInput: {},
    warningMsg: "",
    successMsg: "",
    isLoading: false,
    isFilterOpen: true,
    fromDate: ReactDatetime.moment(getLastMonthDate()),
    toDate: ReactDatetime.moment(new Date()),
    qrCodeModal: false,
    searchKey: "",
    selectAll: false,
    printAll: false,
    enableBatchSerialNo: true,
    enableItemCode: true,
    enableQty: false,
    customerList: [],
    itemReservationPopover: [],
    selectedItem: "",
  };

  toggleCollapse = () => {
    this.setState((state) => ({ isFilterOpen: !state.isFilterOpen }));
  };

  toggleQrCodeModal = () => {
    this.setState((state) => ({ qrCodeModal: !state.qrCodeModal }));
  };

  toggleItemReservationPopover = (key) => {
    let itemReservationPopover = [...this.state.itemReservationPopover];
    itemReservationPopover[key] = itemReservationPopover[key] ? false : true;

    console.log("itemReservationPopover: " + JSON.stringify(itemReservationPopover));
    this.setState({ itemReservationPopover });
  };

  setItemForReservationPopover = (selectedItemKey, selectedItem) => {
    this.setState({ selectedItemKey, selectedItem, warningMsg: "", successMsg: "" });
  };

  handlePrintAll = () => {
    // this.setState({ printAll: true });

    if (this.ref.current === null) {
      return;
    }

    toPng(this.ref.current, { cacheBust: true })
      .then(async (dataUrl) => {
        // const link = document.createElement('a')
        // link.download = 'my-image-name.png'
        // link.href = dataUrl
        // link.click();

        // window.open(dataUrl, '_blank');

        /* #1 */
        const myWindow = window.open("_blank");
        let image = new Image();
        image.src = dataUrl;
        // setTimeout(function(){

        //NOTE: without await, the print page was blank
        await myWindow.document.write(image.outerHTML);
        myWindow.focus();
        myWindow.print();
        myWindow.close();
        // }, 0);

        /* #2 - zz - Blank page
        const myWindow = window.open(dataUrl, "_blank");
        myWindow.focus();
        myWindow.print();
        myWindow.close();*/
      })
      .catch((err) => {
        console.log("Error converting Html to Image: " + err);
      });
  };

  // printChildWindow = (childWindow) => {
  //   childWindow.print();
  // }

  /**
   * Update the 'selected' prop to teh Items for printing
   *
   * @param {Number}  index         Position of the selected/unselected Item
   * @param {Boolean} isSelected    if the Item is selected or unselected
   */
  handleItemSelection = (index, isSelected) => {
    this.setState({ isLoading: true });
    let batchSerialItemsList = cloneDeep(this.state.batchSerialItemsList);

    if (Array.isArray(batchSerialItemsList) && batchSerialItemsList.length > 0) {
      if (index > -1) {
        batchSerialItemsList[index].isSelected = isSelected;
        this.setState({ batchSerialItemsList, isLoading: false });
      } else {
        let selectAll = !this.state.selectAll;
        batchSerialItemsList.forEach((item) => {
          item.isSelected = selectAll;
        });
        this.setState({ batchSerialItemsList, selectAll, isLoading: false });
      }
    }
  };

  /**
   * Gets the list of Warehouses/Bin Locations from the resp. APIs and sets them to "state"
   * @param {String} type "Warehouse" or "BinLocation"
   */
  loadDropdownList = async (type, filter = "") => {
    this.setState({ isLoading: true });
    let stateVariable = "",
      response;
    /*if (type === "item") {
      stateVariable = "allItemsList";
    }
    else */
    if (type === "WAREHOUSE") {
      stateVariable = "warehouseList";
    } else if (type === "BIN_LOCATION") {
      stateVariable = "binLocationList";
    }
    try {
      response = await api.get("custom/" + type.toLowerCase());
      response = response.data;
      // console.log(`Item List: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        this.setState({ [stateVariable]: response });

        if (type === "item") {
          this.setState({ filteredItemsList: response });
        }
      }
    } catch (error) {
      this.setState({ warningMsg: error });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /**
   * Returns an array of indexes of elements who's value in the 'propName' matche the 'filterValue
   *
   * ##Example
   * array: [{WHCode:"A", BinCode: "12",..}, {WHCode:"A", BinCode: "11",..}, {WHCode:"B", BinCode: "12"},..]
   * propName: "BinCode"
   * filterValue: "12"
   *
   * result: [0, 2]
   *
   * @param {Array} array         Array of Objects
   * @param {String} propName     Property in the object based on which values must be filtered
   * @param {String} filterValue
   * @returns Array of Indexes
   */
  findAllIndexes = (array, propName, filterValue) => {
    const indexes = array
      .map((ele, i) => (ele[propName] === filterValue ? i : -1))
      .filter((i) => i !== -1);
    return indexes;
  };

  /**
   * Get the ItemCode, Quantity & Warehouse details from the user entered Batch or Serial No.
   */
  getBatchSerialInfo = async (warehouse, binLocation) => {
    // const { warehouse, binLocation } = this.state;
    this.setState({ warningMsg: "", successMsg: "" });

    if (!warehouse) {
      this.setState({ warningMsg: "Select a Warehouse" });
    }
    //TODO: Commenting this for now, as LTL doesnt have items in Bin
    /*
    else if(!binLocation) {
      this.setState({ warningMsg: "Select a Bin" });
    }*/
    else {
      //If BatchSerial list is already loaded then filter BatchSerials from the avialbe records instead of
      //making a new API call
      //NOTE: 'batchSerialItemsList' will be reset only when WH changes
      if (
        Array.isArray(this.state.batchSerialItemsList) &&
        this.state.batchSerialItemsList.length > 0
      ) {
        if (binLocation) {
          //get all the BatchSerialItem recs. with "BinCode" that is equal to "binLocation"
          const filteredBatchSerialItemKeys = this.findAllIndexes(
            this.state.batchSerialItemsList,
            "BinCode",
            binLocation,
          );
          this.setState({ filteredBatchSerialItemKeys });
        } else {
          this.setState({ filteredBatchSerialItemKeys: [] });
        }
      } else {
        this.setState({ warningMsg: "", isLoading: true });
        try {
          const response = await api.get("custom/batch-serial-info", {
            params: { warehouseCode: warehouse, binCode: binLocation },
          });
          // console.log("getBatchSerialInfo - response.data: "+ JSON.stringify(response.data));

          if (Array.isArray(response.data) && response.data.length) {
            // if(type === "ITEMS") {
            //   this.setState({
            //     itemsList: response.data,
            //   });
            // }
            // else {
            this.setState({
              batchSerialItemsList: response.data,
            });
            // }
          } else {
            this.setState({
              batchSerialItemsList: [],
              warningMsg: "No items found",
            });
          }
        } catch (err) {
          this.setState({ warningMsg: getErrorMessageFromResponse(err) });
        } finally {
          this.setState({ isLoading: false });
        }
      }
    }
  };

  handleWarehouseChange = async (stateVariable, warehouseCode) => {
    this.setState({ selectAll: false }); //isLoading: true,
    if (stateVariable === "warehouse") {
      /*if(warehouseCode) {
        //TODO: Commenting this for now, as LTL doesnt have items in Bin & added below code
        //to call the API right away, b4 selecting Bin
        binLocationList = await getBinsAndItemQtyForWarehouse("BINS", warehouseCode);
      }*/
      if (!warehouseCode) {
        this.setState({
          batchSerialItemsList: [],
        });
      }

      this.setState(
        {
          [stateVariable]: warehouseCode,
          invalidInput: {},
          warningMsg: "",
          // isLoading: false,
          batchSerialItemsList: [],
        },
        async () => {
          await this.getBatchSerialInfo(warehouseCode, "");
        },
      );
      // await this.getBatchSerialInfo(warehouseCode, "");
    }
  };

  /**
   * zzz NOT REQUIRED
   *
   * Clears the selected Bin from the auto-complete textbox,
   * Invoked when "X" icon is clicked
   */
  /*resetClearInput = () => {
    console.log("this.state.batchSerialItemsList: "+JSON.stringify(this.state.batchSerialItemsList));
    this.setState({
      batchSerialItemsList: cloneDeep(this.state.batchSerialItemsList)
    });
  }*/

  /**
   * zzz NOT REQUIRED
   *
   * Called from BinLocationDropdown component.
   * Resets Batch/Serial list when bin is removed
   * @param {Event} value parameter passed from BinLocationDropdown comp.
   */
  /*
  handleBinReset = (value) => {
    console.log("event.target.value: "+value);
    console.log("this.state.batchSerialItemsList: "+JSON.stringify(this.state.batchSerialItemsList));
    
    if(value === "") {
      this.setState({
        batchSerialItemsList: cloneDeep(this.state.batchSerialItemsList)
      });
    }
  }*/

  handleBinChange = async (bin) => {
    // let binLocation = event.target.value
    await this.getBatchSerialInfo(this.state.warehouse, bin.binCode);
  };

  /**
   * Filters Items based on the 'searchKey' and returns the matching records.
   * @param {String} searchKey Item Code or Name
   */
  handleSearch = (searchKey) => {
    console.log(`StockTransferDetails - ${searchKey}`);
    const { batchSerialItemsList } = this.state;
    let filteredBatchSerialItemKeys = [];

    //if the searchKey is Not a Number, change it to Upper case to make the search 'case insensitive'
    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }

    batchSerialItemsList.forEach((item, i) => {
      if (
        item.ItemCode.toString().indexOf(searchKey) > -1 ||
        item.WhsCode.toUpperCase().indexOf(searchKey) > -1 ||
        item.BinCode.toUpperCase().indexOf(searchKey) > -1 ||
        (item.BatchNumberProperty &&
          item.BatchNumberProperty.toUpperCase().indexOf(searchKey) > -1) ||
        (item.InternalSerialNumber &&
          item.InternalSerialNumber.toUpperCase().indexOf(searchKey) > -1)
      ) {
        filteredBatchSerialItemKeys.push(i);
      }
    });
    // console.log(`filteredBatchSerialItemKeys: ${JSON.stringify(filteredBatchSerialItemKeys)}`);
    this.setState({ filteredBatchSerialItemKeys });
  };

  handleSort = (column) => (e) => {
    let actualColumn = column;

    const direction = this.state.sort.column
      ? this.state.sort.direction === "asc"
        ? "desc"
        : "asc"
      : "desc";
    const sortedData = this.state.batchSerialItemsList.sort((a, b) => {
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
      batchSerialItemsList: sortedData,
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
    this.setState({ isLoading: true });
    try {
      if (!Array.isArray(this.state.warehouseList) || !this.state.warehouseList.length) {
        await this.loadDropdownList("WAREHOUSE");
      }
      const customerList = await getCustomerInfo();
      this.setState({ customerList });
    } catch (err) {
      this.setState({ warningMsg: JSON.stringify(err) });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  render() {
    const {
      batchSerialItemsList,
      filteredBatchSerialItemKeys,
      qrCodeModal,
      type,
      batchSerialNo,
      itemCode,
      quantity,
    } = this.state;
    let tableHeader = [
      { label: "#" },
      // { label: "In Date", sortField: "InDate" },
      // { label: "Warehouse", sortField: "WhsCode" },
      { label: "Bin", sortField: "BinCode" },
      { label: "Item No.", sortField: "ItemCode" },
      // { label: "Item Name", sortField: "ItemName" },
      { label: "Qty.", sortField: "Quantity" },
      { label: "Batch/Serial#" },
      // { label: "Generate" },
    ];

    let headerLabel = `Select Warehouse & Bin to filter records. Click a Batch/Serial to generate QR Code.`;
    if (this.props.screen === "ITEM_RESERVATION") {
      headerLabel = `Click on a Batch/Serial# to reserve an item.`;

      // tableHeader.push({ label: "Reserved For", sortField: "U_ReservedFor" });
      // tableHeader.push({ label: "Reserved For", sortField: "U_ReservedFor" });
    } else {
      tableHeader.unshift({ label: "" });
    }

    //show the 'Edit' column only if the currently logged in user has the required permission
    /*if(checkUserPermission(portalModules.GRPO, permissions.WRITE)) {
      tableHeader.push("Edit");
    }*/

    let enablePrint = false;
    //check if atleast one Item is selected to enable Print btn
    const index = batchSerialItemsList.findIndex((item) => item.isSelected === true);
    // if(index > -1) {
    //   enablePrint = true;
    // }
    const selectedBatchSerialsList = batchSerialItemsList.filter(
      (item) => item.isSelected === true,
    );
    if (Array.isArray(selectedBatchSerialsList) && selectedBatchSerialsList.length > 0) {
      enablePrint = true;
    }

    return (
      <>
        {/* Page content */}
        <Row className="donot-printme">
          <Col className="order-xl-1" xl="12">
            {/** GRPODraft Table */}
            <Row>
              <Col className="mb-5 mb-xl-0" xl="12">
                <Card className="bg-white shadow">
                  <CardHeader className="border-0 mb--4 mt--2">
                    {" "}
                    {/** bg-white */}
                    <Row className="align-items-center mt--1">
                      <Col md="8">
                        {/* <h3 className="mb-1.5"> GRPODraft List </h3> */}
                        <div className="mb-2 mt--2">
                          <i className="fa fa-info-circle text-blue" /> &nbsp;
                          <small>{headerLabel}</small>
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
                        </div>
                      </Col>
                      <Col className="text-right" md="1">
                        {/* <FavouriteButton /> */}
                      </Col>
                    </Row>
                    <Card className="bg-white shadow mb-4 mb-1 pb-0">
                      <CardHeader className="border-0 mb--4 mt-0 pb-1">
                        {" "}
                        {/** bg-white */}
                        <Row className="align-items-center mt--1">
                          <Col sm="3" md="4">
                            <h3>Filters</h3>
                          </Col>
                          <Col sm="6" md="5"></Col>
                          <Col sm="2">
                            {this.state.isLoading && (
                              <>
                                <Spinner color="primary" className="reload-spinner" />
                                <small className="mt-1 mb-3 ml-3 text-primary">Processing...</small>
                              </>
                            )}
                          </Col>
                          <Col xs="1" className="ml-0">
                            {!this.state.isFilterOpen ? (
                              <ChevronDown
                                className="text-primary cursor-pointer"
                                style={{ marginTop: "-15px" }}
                                size={16}
                                onClick={this.toggleCollapse}
                              />
                            ) : (
                              <ChevronUp
                                className="cursor-pointer"
                                style={{ marginTop: "-15px" }}
                                size={16}
                                onClick={this.toggleCollapse}
                              />
                            )}
                          </Col>
                        </Row>
                      </CardHeader>
                      <CardBody className="mt--1 mb--4">
                        <Collapse isOpen={this.state.isFilterOpen}>
                          <Row className="text-left mb-3">
                            <Col sm="6" md="3">
                              <small className="text-muted">Warehouse</small>
                              <div className="mt-1 mb-3">
                                <Input
                                  bsSize="sm"
                                  type="select"
                                  name="select"
                                  className={
                                    "form-control display-4 text-gray-dark " +
                                    this.state.invalidInput.warehouse
                                  }
                                  value={this.state.warehouse}
                                  //style={{ width: "auto" }} //width: 100
                                  onChange={(event) =>
                                    this.handleWarehouseChange("warehouse", event.target.value)
                                  }
                                >
                                  <option value="">-- Select a Warehouse --</option>
                                  {this.state.warehouseList.map((warehouse, key) => {
                                    return (
                                      <option key={warehouse.WhsCode} value={warehouse.WhsCode}>
                                        {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
                                      </option>
                                    );
                                  })}
                                </Input>
                              </div>
                            </Col>
                            <Col sm="6" md="3" className="mt-1">
                              <BinLocationDropdown
                                label="Bin Location"
                                warehouseCode={this.state.warehouse}
                                handleBinChange={this.handleBinChange}
                                // handleBinReset={this.handleBinReset}
                                // resetClearInput={this.resetClearInput}
                              />
                            </Col>
                            <Col md="3" className="mt-2 pt-1">
                              <FormGroup
                                className={classnames({
                                  focused: this.state.searchAltFocused,
                                })}
                              >
                                <InputGroup className="input-group mb--4 ml-0 mt-3" size="sm">
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
                                    onKeyUp={(e) => this.handleSearch(e.target.value)}
                                  />
                                </InputGroup>
                              </FormGroup>
                            </Col>
                            {enablePrint && (
                              <Col>
                                <PreviewPrintQRCodes
                                  // className="mt-2 pt-1 ml-2"
                                  className="mt-2 pt-1 mb-0"
                                  batchSerialsList={selectedBatchSerialsList}
                                  batchNumberProperty={itemTypeProperties.BATCH_NUMBER_OLD}
                                  internalSerialNumber={itemTypeProperties.SERIAL_NUMBER}
                                  quantity="OnHandQty"
                                  showPrintOptions={true}
                                  // compactMode={true}
                                />
                              </Col>
                            )}
                          </Row>
                          {enablePrint && (
                            <>
                              {/* <Row className="mb--3 mt--2"> <Col><h4>Print Options</h4></Col></Row> */}
                              {/* <Row className="text-left mb-0">
                            <PreviewPrintQRCodes
                              // className="mt-2 pt-1 ml-2"
                              className="mt-0 pt-1 mb-2"
                              batchSerialsList={selectedBatchSerialsList}
                              batchNumberProperty={itemTypeProperties.BATCH_NUMBER_OLD}
                              internalSerialNumber={itemTypeProperties.SERIAL_NUMBER}
                              quantity="OnHandQty"
                              showPrintOptions={true}
                              // compactMode={true}
                            />
                          </Row> */}
                            </>
                          )}
                        </Collapse>
                      </CardBody>
                    </Card>
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
                          {tableHeader.map((headerCol, key) => {
                            return this.props.screen != "ITEM_RESERVATION" && key === 0 ? (
                              <th>
                                <CustomInput
                                  inline
                                  id={`item-0`}
                                  type="checkbox"
                                  label=""
                                  className="text-gray-dark mt-1"
                                  checked={this.state.selectAll ? true : false}
                                  onChange={this.handleItemSelection}
                                />
                              </th>
                            ) : (
                              <th
                                scope="col"
                                key={headerCol.label}
                                onClick={this.handleSort(headerCol.sortField)}
                                className="cursor-pointer"
                                style={{
                                  textAlign:
                                    headerCol.label === "Batch/Serial#" &&
                                    this.props.screen != "ITEM_RESERVATION"
                                      ? "center"
                                      : "auto",
                                }}
                              >
                                {headerCol.label}
                                <span className={this.setSortArrow(headerCol.sortField)} />
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(batchSerialItemsList) && batchSerialItemsList.length > 0
                          ? batchSerialItemsList.map((item, itemKey) => {
                              //Display the Batch/Serial recs. whose 'keys' are present in the 'filtered' list
                              if (
                                filteredBatchSerialItemKeys.length === 0 ||
                                filteredBatchSerialItemKeys.includes(itemKey)
                              )
                                return (
                                  <tr
                                    key={`${item.BatchNumberProperty}-${item.InternalSerialNumber}-${item.ItemCode}-${item.OnHandQty}-${item.WhsCode}-${item.BinCode}`}
                                    className="neo-tr"
                                  >
                                    {this.props.screen != "ITEM_RESERVATION" && (
                                      <td>
                                        <CustomInput
                                          inline
                                          id={`item-${item.BatchNumberProperty}-${item.InternalSerialNumber}-${item.ItemCode}-${item.OnHandQty}-${item.WhsCode}-${item.BinCode}`}
                                          type="checkbox"
                                          label=""
                                          className="text-gray-dark mt-1" //display-4
                                          checked={item.isSelected ? true : false}
                                          onChange={(e) =>
                                            this.handleItemSelection(itemKey, e.target.checked)
                                          }
                                          //disabled={this.state.displayMode === constants.EDIT ? false : true}
                                        />
                                      </td>
                                    )}
                                    <td>{itemKey + 1}</td>
                                    {/* <td>{formatDate(item.InDate, "MMM D, YYYY")}</td> */}
                                    {/* <td>{item.WhsCode}</td> */}
                                    <td>{item.BinCode}</td>
                                    <td>{item.ItemCode}</td>
                                    {/* <td style={{ whiteSpace: "unset" }}>{item.ItemName}</td> */}
                                    {/* <td>{item.BatchNumberProperty ? item.BatchNumberProperty : item.InternalSerialNumber}</td> */}
                                    <td>{parseFloat(item.OnHandQty).toFixed(2)}</td>
                                    <td>
                                      <th className="mb-0 text-sm">
                                        {/* <a
                                title="Click to generate QR Code"
                                style={{cursor: "pointer", textDecoration: "underline"}}
                                onClick={item.BatchNumberProperty
                                  ? () => this.generateQRCode("BatchNo", item.BatchNumberProperty, item.ItemCode, item.OnHandQty)
                                  : () => this.generateQRCode("SerialNo", item.InternalSerialNumber, item.ItemCode, item.OnHandQty)}
                              > */}
                                        {item.BatchNumberProperty
                                          ? item.BatchNumberProperty
                                          : item.InternalSerialNumber}
                                        {/* </a> */}
                                      </th>
                                    </td>
                                    {/*checkUserPermission(portalModules.GRPO, permissions.WRITE) &&
                              <td style={{ textAlign: "center" }}>
                                <Edit
                                  size={20}
                                  className="mr-1 pb-1 text-primary cursor-pointer"
                                  // style={{cursor: "pointer"}}
                                  onClick={() => this.handleEdit()}
                                />
                              </td>
                              */}
                                  </tr>
                                );
                            })
                          : null}
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
                    <h3 className="mb-0">GRPODraft List</h3>
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

export default ItemsList;
