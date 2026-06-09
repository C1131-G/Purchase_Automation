import React from "react";
import classnames from "classnames";
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
  InputGroupAddon,
  InputGroupText,
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
  Toast,
  ToastBody,
  ToastHeader,
} from "reactstrap";
import { Tooltip } from "reactstrap";
import { Trash2 } from "react-feather";
// import QRCode from "qrcode.react";
import cloneDeep from "lodash.clonedeep";

import BranchDropdown from "../components/BranchDropdown";
import BinLocationDropdown from "../components/BinLocationDropdown";
import ScanAndSearchBatchSerialItems from "../components/ScanAndSearchBatchSerialItems";
import VirtualizedItemsList from "../components/VirtualizedItemsList";
import PreviewPrintQRCodes from "../components/PreviewPrintQRCodes";

import api from "../../config/api-nodejs";
//for Mock API
import axios from "axios";
import { scrollToElement, formatDate, generateUniqueNumber } from "../../config/util.js";
import { realistic, fireworks } from "../../util/confetti";
import {
  userRoles,
  draftStatus as draftStatusList,
  displayModes,
  portalModules,
  apiURIs,
  itemTypes,
  itemTypeProperties,
  isMultiBranchEnabled,
  requestComment,
} from "../../config/config.js";

import { getBinsAndItemQtyForWarehouse } from "../../helper/bin-warehouse";
import { getBatchSerialsFromItemsList } from "../../helper/helper";
// import "../../assets/css/custom-style.css";
// import "./popover.scss";

const mode = {
  NORMAL: "NORMAL",
  DISABLED: "DISABLED",
};
const today = new Date();

class InventoryCountingDetails extends React.Component {
  _isMounted = false;
  state = {
    branch: isMultiBranchEnabled ? "" : 1, //Set default branch when multi-branch is not set
    error: "",
    successMsg: "",
    warningMsg: "",
    infoMsg: "",
    operation: this.props.operation,
    countingDate: formatDate(today, "MMM D, YYYY"),
    countingTime: formatDate(today, "hh:mm"),
    itemListPopup: false,
    warehouseList: [],
    binLocationList: [],
    binCode: "",

    fromWarehouse: "",
    // toWarehouse: "",
    toWarehouse: this.props.selectedStockTransReq ? this.props.selectedStockTransReq.ToWhsCode : "",
    oldBatchSerialItemsList: [],
    filteredOldBatchSerialItemsList: [],
    itemsListForTransfer: [],
    toBinListPopOver: [],
    invalidRowFromWarehouse: [],
    invalidInput: {},
    availableQuantityPopOver: [],
    fromWarehousePopover: false,
    tempFromWarehouse: "",
    qrScannerPopover: false,
    oldBatchSerialItemsPopup: false,
    normalItemsList: [],

    rejectReasonPopup: false,
    qrCodesPopup: false,
    rejectReason: "",
    popupWarningMsg: "",
    selectedStockTransReq: {},
    draftStatus: "",
    actualDraftStatus: "",
    internalKey: "",
    requestDocEntry: "",
    originatorId: "",
    docDate: "",
    comments: "",
    batchSerialsList: [],
  };

  toggleModal = (name) => {
    console.log("toggleModal");
    /**
     * Added cond. to check Component "mounted" status to fix below warning 
     *    Warning: Can't perform a React state update on an unmounted component.
     *    This is a no-op, but it indicates a memory leak in your application.
     *    To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
    in InventoryCountingDetails (at GRPODraftDetails.js:62)
    in Suspense (at GRPODraftDetails.js:61)
    */
    if (this._isMounted) {
      this.setState({
        [name]: !this.state[name],
      });
    }
  };

  togglePopover = (name) => {
    this.setState({ [name]: !this.state[name] });
  };

  openScanner = () => {
    this.setState({});
  };

  /**
   * Auto clears warning & success msgs that are displayed in Toast
   * @param {String} name  Name of the 'state' varable, 'warningMsg' or 'successMsg'
   */
  clearToastMessage = (name) => {
    setTimeout(() => this.setState({ [name]: "" }), 5000);
  };

  /**
   * Called from <VirtualizedItemsList>. Adds the selected item to 'itemsListForTransfer'
   *
   * @param {Object}  selectedItem  Current Item obj.
   */
  handleItemSelection = async (selectedItem) => {
    let itemsListForTransfer = this.addSelectedItemToRow(
      selectedItem,
      cloneDeep(this.state.itemsListForTransfer),
    );
    this.setState({ itemsListForTransfer });
  };

  /**
   * Callback func. to be executed from <BranchDropdown>
   */
  handleBranchChange = async (branch) => {
    this.setState({ isLoading: true, invalidInput: {} });
    if (branch) {
      console.log("handleBranchChange: " + branch);
      this.setState({ branch, isLoading: false, warningMsg: "" });
      // this.resetItemWarehouseBinDetails();
      await this.loadDropdownList("WAREHOUSE", branch);
    } else {
      this.setState({ branch: "", warehouseList: [], binLocationList: [], isLoading: false });
      // this.resetItemWarehouseBinDetails()
    }
  };

  /**
   * Update Quantity and other values changed in the Items Table
   * @param {String} fieldName  Column Name
   * @param {String} value      Selected value
   * @param {Number} key        Index
   */
  handleFieldChange = (fieldName, value, key) => {
    this.setState({ warningMsg: "" });
    if ((fieldName === "Quantity") & (value > 0)) {
      let itemsListForTransfer = [...this.state.itemsListForTransfer];

      if (!itemsListForTransfer[key].originalQty) {
        itemsListForTransfer[key].originalQty = itemsListForTransfer[key].Quantity;
      }

      if (value > parseInt(itemsListForTransfer[key].originalQty)) {
        this.setState({ warningMsg: "Quantity cannot be greater than the Requested quantity" });
      } else {
        itemsListForTransfer[key][fieldName] = value;
        this.setState({ itemsListForTransfer });
      }
    }
  };

  /**
   * Removes the selected Item
   * @param {Number} itemKey    Index of the current 'row' in the able
   */
  handleRemoveItem = (itemKey) => {
    this.setState({ warningMsg: "" });
    let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);
    const deletedItem = itemsListForTransfer[itemKey].ItemCode;

    //remove the selected item
    itemsListForTransfer.splice(itemKey, 1);

    this.setState({
      itemsListForTransfer,
      successMsg: `Item ${deletedItem} has been removed!`,
    });
    this.clearToastMessage("successMsg");
  };

  /**
   * Removes Batch or Serial under a particular Item
   * @param {String} itemType   Batch or Serial
   * @param {Number} itemKey    Index of the current 'row' in the able
   * @param {Number} batchSerialKey Index of the current Batch or Serial under the current 'row'
   */
  handleDeleteBatchSerial = (itemType, itemKey, batchSerialKey) => {
    this.setState({ warningMsg: "" });
    let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);
    let filteredOldBatchSerialItemsList = cloneDeep(this.state.filteredOldBatchSerialItemsList);
    let oldBatchSerialItemsList = cloneDeep(this.state.oldBatchSerialItemsList);

    let deletedBatchNum, deletedSerialNum;

    if (itemType === itemTypes.BATCHES) {
      console.log(
        "itemsListForTransfer[itemKey].InventoryCountingBatchNumbers[batchSerialKey].Quantity: " +
          itemsListForTransfer[itemKey].InventoryCountingBatchNumbers[batchSerialKey].Quantity,
      );
      deletedBatchNum =
        itemsListForTransfer[itemKey].InventoryCountingBatchNumbers[batchSerialKey].BatchNumber;

      //remove the selected Batch from the row
      itemsListForTransfer[itemKey].InventoryCountingBatchNumbers.splice(batchSerialKey, 1);

      //reduce the current Batch item's Qty (that is selected for deletion) from the
      //CountedQuantity of the item
      itemsListForTransfer[itemKey].CountedQuantity = this.getTotalCountedQty(
        itemsListForTransfer[itemKey].InventoryCountingBatchNumbers,
      );
      // parseFloat(itemsListForTransfer[itemKey].CountedQuantity) - batchQty;
    } else if (itemType === itemTypes.SERIAL_NUMBERS) {
      deletedSerialNum =
        itemsListForTransfer[itemKey].InventoryCountingSerialNumbers[batchSerialKey]
          .InternalSerialNumber;

      //remove the selected Serial from the Item
      itemsListForTransfer[itemKey].InventoryCountingSerialNumbers.splice(batchSerialKey, 1);

      //reduce the current Serial item's Qty (that is selected for deletion) from the
      //AddedQty of the item
      itemsListForTransfer[itemKey].CountedQuantity = this.getTotalCountedQty(
        itemsListForTransfer[itemKey].InventoryCountingSerialNumbers,
      );
    }

    //Uncheck old item's checkbox against the deleted Batch/Serial no. in the 'old' items popup
    //if items are available in the popup
    if (Array.isArray(oldBatchSerialItemsList) && oldBatchSerialItemsList.length > 0) {
      oldBatchSerialItemsList.forEach((item) => {
        //check if BatchNumber & InternalSerialNumber are NOT null
        if (
          (item.BatchNumber && deletedBatchNum && item.BatchNumber == deletedBatchNum) ||
          (item.InternalSerialNumber &&
            deletedSerialNum &&
            item.InternalSerialNumber == deletedSerialNum)
        ) {
          item.selected = false;
        }
      });
      this.setState({ oldBatchSerialItemsList });
    }
    if (
      Array.isArray(filteredOldBatchSerialItemsList) &&
      filteredOldBatchSerialItemsList.length > 0
    ) {
      filteredOldBatchSerialItemsList.forEach((item) => {
        if (
          (item.BatchNumber && deletedBatchNum && item.BatchNumber == deletedBatchNum) ||
          (item.InternalSerialNumber &&
            deletedSerialNum &&
            item.InternalSerialNumber == deletedSerialNum)
        ) {
          item.selected = false;
        }
      });
      this.setState({ filteredOldBatchSerialItemsList });
    }
    this.setState({
      itemsListForTransfer,
      successMsg: "Selected Batch/Serial no. has been removed!",
    });
  };

  /**
   * Toggles Row level Bin popover
   * @param {Number} key
   */
  toggleRowLevelToBinPopOver = (key) => {
    console.log("toggleRowLevelToBinPopOver - key: " + key);
    let toBinListPopOver = [...this.state.toBinListPopOver];
    toBinListPopOver[key] = toBinListPopOver[key] ? false : true;

    console.log("toBinListPopOver: " + JSON.stringify(toBinListPopOver));
    this.setState({ toBinListPopOver });
  };

  /**
   * Invoked from <BinLocationDropdown> comp. Gets the bins under selected WH and sends it to parent comp.
   * @param {Number} key
   * @param {Object} bin { binCode, binLocationList }
   */
  setBinLocationDetails = (bin) => {
    this.setState({ warningMsg: "" });
    this.setState({ binCode: bin.binCode });

    if (bin.binLocationList) {
      this.setState({ binLocationList: bin.binLocationList });
    }
  };

  /**
   * Returns the sum of Counted quantity for Batches/Serials under an item
   * @param {Array} batchSerialRecords  Array of Batch or Serial Items
   */
  getTotalCountedQty = (batchSerialRecords) => {
    let total = 0;
    batchSerialRecords.forEach((e) => {
      total = +total + parseFloat(e.Quantity);
    });
    return total;
  };

  /**
   * Update Quantity and other values changed in the Items Table
   * @param {String} itemType   Batch or Serial
   * @param {String} value      New Qty
   * @param {Number} itemKey    Index of the current 'row' in the able
   * @param {Number} batchSerialKey Index of the current Batch or Serial under the current 'row'
   */
  handleQuantityChange = (itemType, value, itemKey, batchSerialKey) => {
    this.setState({ warningMsg: "" });
    value = parseFloat(value);
    if (value > 0) {
      let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);
      let diff;
      if (itemType === itemTypes.BATCHES) {
        //set the new value to the Batch
        itemsListForTransfer[itemKey].InventoryCountingBatchNumbers[batchSerialKey].Quantity =
          value;

        //updated the Item level 'Counted Qty'
        itemsListForTransfer[itemKey].CountedQuantity = this.getTotalCountedQty(
          itemsListForTransfer[itemKey].InventoryCountingBatchNumbers,
        );
      } else if (itemType === itemTypes.SERIAL_NUMBERS) {
        //set the new value to the Batch
        itemsListForTransfer[itemKey].InventoryCountingSerialNumbers[batchSerialKey].Quantity =
          value;
        //updated the Item level 'Counted Qty'
        itemsListForTransfer[itemKey].CountedQuantity = this.getTotalCountedQty(
          itemsListForTransfer[itemKey].InventoryCountingSerialNumbers,
        );
      }

      // parseFloat(itemsListForTransfer[itemKey].CountedQuantity) + value;
      this.setState({ itemsListForTransfer });
    } else {
      this.setState({ warningMsg: "Quantity cannot be less than 1" });
    }
  };

  /**
   * Make a copy of the current item and adds it to the Transfer Req.
   * @param {Object} selectedItem
   * @param {Number} key
   */
  handleCopyItem = (selectedItem, key) => {
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    let copiedItem = {
      ItemCode: selectedItem.ItemCode,
      ItemName: selectedItem.ItemName,
      Quantity: 0,
      InvntryUom: selectedItem.InvntryUom,
      FromWarehouse: "",
    };
    itemsListForTransfer.splice(key + 1, 0, copiedItem);
    this.setState({ itemsListForTransfer });
  };

  /**
   * Gets all Items for the selected STR
   * @param {Number} docEntry   DocEntry of the selected ST or STR
   * @param {String} moduleName Name of the module (STOCK_TRANSFER_REQUEST or STOCK_TRANSFER).
   *                            This value is set from tab#1 or #2. Based on the module appropriate
   *                            api is used to pull "Item Details"
   */
  getItemsList = async (requestStatus, docEntry, moduleName) => {
    if (!this.state.itemsListForTransfer.length) {
      this.setState({ isLoading: true });
      let uri;
      // if(moduleName === portalModules.STOCK_TRANSFER_REQUEST) {

      console.log("requestStatus: " + requestStatus);
      //Call the "direct" api when teh op. is `Create` bcoz only approved STRs will be used to "create" an ST
      //"drafts" will not be used here
      if (this.state.operation === displayModes.CREATE) {
        uri = `/custom/${apiURIs[moduleName]}/rows/direct`;
      } else {
        //For direct STRs/STs
        if (requestStatus == draftStatusList.AUTO_APPROVED) {
          uri = `/custom/${apiURIs[moduleName]}/rows/direct`;
        }
        //For Drafts
        else {
          uri = `/custom/${apiURIs[moduleName]}/rows/draft`;
        }
      }
      /*}
      else if (moduleName === portalModules.STOCK_TRANSFER) {
        path = "stock-transfer";
      }*/
      console.log("InventoryCountingDetails - getItemsList - uri: " + uri);

      try {
        //pass the "type" as "rows" & DocEntry to API to pull the Item Rows
        const response = await api.get(`${uri}/${docEntry}`, {
          params: { userId: localStorage.getItem("InternalKey") },
        });
        let itemsListForTransfer = response.data.rows;
        console.log(
          `InventoryCountingDetails - getItemsList List: ${JSON.stringify(itemsListForTransfer)}`,
        );
        if (response.data && Array.isArray(itemsListForTransfer) && itemsListForTransfer.length) {
          this.setState({
            // actualDraftStatus: response.data.draftStatus,
            itemsListForTransfer,
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

  /**
   * Returns Warehouse Name for the given Code
   * @param {String} warehouseCode
   */
  getWarehouseName = (warehouseCode) => {
    const { warehouseList } = this.state;
    let warehouseName = warehouseCode;
    if (Array.isArray(warehouseList) && warehouseList.length) {
      for (let i = 0; i < warehouseList.length; i++) {
        if (warehouseList[i].WhsCode === warehouseCode) {
          warehouseName = `${warehouseList[i].WhsCode} - ${warehouseList[i].WhsName}`;
          break;
        }
      }
    }
    return warehouseName;
  };

  /**
   * Sets the selected Warehouse Code to state var.
   * @param {String} stateVariable  fromWarehouse or toWarehouse
   * @param {String} warehouseCode       selected Warehouse Code
   * @param {Boolean} isConfirmed   bool. to check if user has confirmed that changing Warehouse will affect all
   *                                the Row level items' From Warehouses too
   */
  handleWarehouseChange = async (warehouseCode) => {
    let invalidInput = { ...this.state.invalidInput };

    /*let binLocationList = [];
    if(warehouseCode) {
      // binLocationList = await this.getBinsAndItemQtyForWarehouse("BINS", warehouseCode);
      binLocationList = await getBinsAndItemQtyForWarehouse("BINS", warehouseCode);
    } */

    this.setState({
      // binLocationList,
      binCode: "",
      warehouseCode,
      invalidInput: {},
      warningMsg: "",
    });
  };

  /**
   * TODO: Need to move this method to helper.js and use it from other comps. too
   * (eg: to load Warehouse list in GRPODraft/ItemDetails.js)
   * Gets the list of Item Code & Desc from Item Master table and load the ITem dropdown list
   * @param {String} type "item"
   */
  loadDropdownList = async (type, value) => {
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
      response = await api.get("custom/" + type.toLowerCase(), { params: { branchId: value } });
      response = response.data;
      console.log(`Item List: ${JSON.stringify(response)}`);
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
  openTab = async () => {
    console.log(
      "this.props.selectedStockTransReq: " + JSON.stringify(this.props.selectedStockTransReq),
    );
    const requestDocEntry = this.props.selectedStockTransReq.ActualDocEntry
      ? this.props.selectedStockTransReq.ActualDocEntry
      : this.props.selectedStockTransReq.DocEntry;

    if (
      [displayModes.CREATE, displayModes.EDIT, displayModes.VIEW].includes(this.props.operation)
    ) {
      console.log(`InventoryCountingDetails- operation: ${this.props.operation}`);
      console.log(`InventoryCountingDetails- moduleName: ${this.props.moduleName}`);
      console.log(
        `InventoryCountingDetails- selectedStockTransReq.itemList: ${JSON.stringify(this.props.selectedStockTransReq.itemList)}`,
      );
      console.log(
        `InventoryCountingDetails- selectedStockTransReq.U_DraftStatus: ${JSON.stringify(this.props.selectedStockTransReq.U_DraftStatus)}`,
      );

      const requestStatus = this.props.selectedStockTransReq.U_DraftStatus;
      let comments = this.props.selectedStockTransReq.Comments
        ? this.props.selectedStockTransReq.Comments + ". "
        : "";

      //If user navigates to this tab from "Create Transfer" tab, set the below Comments
      if (
        this.props.operation === displayModes.CREATE &&
        this.props.moduleName === portalModules.INVENTORY_COUNTING
      ) {
        comments += `Based on Inventory Counting Request #${this.props.selectedStockTransReq.DocEntry}`;
      }

      this.setState({
        selectedStockTransReq: this.props.selectedStockTransReq,
        requestDocEntry,
        // requestStatus: this.props.selectedStockTransReq.U_DraftStatus,
        requestStatus,
        fromWarehouse: this.props.selectedStockTransReq.FromWarehouse,
        //moving this code to constructor so it will be available during componentDidMount
        // toWarehouse: this.props.selectedStockTransReq.ToWhsCode,
        toBinLocation: this.props.selectedStockTransReq.U_ToBinLocation,
        rejectReason:
          this.props.selectedStockTransReq.U_DraftStatus === draftStatusList.REJECTED &&
          !this.props.selectedStockTransReq.U_RejectedReason
            ? "NA"
            : this.props.selectedStockTransReq.U_RejectedReason,
        docDate: this.props.selectedStockTransReq.DocDate,
        // comments: this.props.selectedStockTransReq.Comments,
        comments,
        originatorId: this.props.selectedStockTransReq.U_OriginatorId,
        multiLevelApproval: this.props.selectedStockTransReq.U_MultiLevelApproval,
        approvalStatusId: this.props.selectedStockTransReq.U_ApprovalStatusId,
        approvalLevel: this.props.selectedStockTransReq.U_ApprovalLevel,

        //getting 'Rows' via a diff. api call (from getItemsList()) instead of getting from below prop.
        // itemsListForTransfer: this.props.selectedStockTransReq.itemList
      });
      await this.getItemsList(requestStatus, requestDocEntry, this.props.moduleName);
    }
  };

  /**
   * Validates the entered data before sending them API
   */
  handleSave = async (event, status) => {
    event.preventDefault();

    //Added for testing
    // this.handleViewQRCodes();
    // return;

    //TODO: Need to replace the below Form Validation logic with the ones from 'StockTransferRequestDetails.js'
    let invalidQtyIndex = -1;
    let request, response;
    let documentLines = [];
    const { operation, normalItemsList } = this.state;
    let itemsList = this.state.itemsListForTransfer;

    //shallow copy the value from state. As this is not an array, slice() cant be used
    let invalidInput = { ...this.state.invalidInput };
    console.log("this.state.itemsListForTransfer: " + JSON.stringify(itemsList));

    if (operation === displayModes.CREATE && Array.isArray(itemsList) && itemsList.length > 0) {
      invalidQtyIndex = itemsList.findIndex((item) => parseFloat(item.CountedQuantity) < 0.001);
    }

    if (invalidQtyIndex > -1) {
      this.setState({ warningMsg: `Add Quantity for item ${itemsList[invalidQtyIndex].ItemCode}` });
      const rowWithInvalidData = document.getElementById("trId" + invalidQtyIndex);
      rowWithInvalidData.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (this.state.operation === displayModes.CREATE && !this.state.branch) {
      invalidInput.branch = "is-invalid";
      this.setState({
        warningMsg: "Select a Branch",
        invalidInput,
      });
    } else if (
      status === draftStatusList.REJECTED &&
      ["", "null", null].includes(this.state.rejectReason)
    ) {
      this.setState({ popupWarningMsg: "Please enter a reason and submit!" });
    } else {
      this.setState({ isLoading: true, invalidInput: {}, infoMsg: "" });

      if (Array.isArray(itemsList) && itemsList.length) {
        itemsList = cloneDeep(itemsList);
        itemsList.forEach((item, itemKey) => {
          //NOTE: LineNumber must start from '1' instead of '0' or BatchNum/SerialNo wouldn't get saved in SAP
          item.LineNumber = itemKey + 1;
          delete item.BinCode; //this prop not required in the API payload
          if (item.ManBtchNum) delete item.ManBtchNum;
          if (item.ManSerNum) delete item.ManSerNum;
          if (item.InvntItem) delete item.InvntItem;

          if (
            Array.isArray(item.InventoryCountingBatchNumbers) &&
            item.InventoryCountingBatchNumbers.length
          ) {
            item.InventoryCountingBatchNumbers.forEach((batch) => {
              batch.BaseLineNumber = itemKey + 1;
            });
          }
          if (
            Array.isArray(item.InventoryCountingSerialNumbers) &&
            item.InventoryCountingSerialNumbers.length
          ) {
            item.InventoryCountingSerialNumbers.forEach((serial) => {
              serial.BaseLineNumber = itemKey + 1;
            });
          }
        });
      }

      if (status == draftStatusList.REJECTED) this.closePopup();

      request = {
        //for testing purpose to avoid "Count Date can't be in future" error thrown by Service Layer
        CountDate: formatDate(today, "YYYY-MM-DD"),
        CountTime: formatDate(today, "HH24:MI:SS"),
        SingleCounterType: "ctUser",
        DocumentStatus: "cdsOpen",
        Remarks: requestComment + this.state.comments,
        BranchID: this.state.branch,
        DocObjectCodeEx: "1470000065",
        userId: localStorage.getItem("InternalKey"),
        InventoryCountingLines: itemsList,
      };

      console.log("*** Stock trans: " + JSON.stringify(request));

      try {
        let response;
        if (this.state.operation === displayModes.CREATE) {
          response = await api.post("/service/inventory-counting", request);
          if (response.data) {
            console.log("Inv Counting. Response: " + JSON.stringify(response.data));
            if (response.data.draftNum) {
              this.setState({
                requestDocEntry: response.data.draftNum,
                successMsg: `Request #${response.data.draftNum} has been created and sent to ${response.data.approverName} for approval`,
                operation: displayModes.VIEW, //to hide Submit button
              });
            } else if (response.data.docNum) {
              // this.handleViewQRCodes();

              //this data will be sent to <PreviewPrintQRCodes>
              const batchSerialsList = getBatchSerialsFromItemsList(
                this.state.itemsListForTransfer,
                portalModules.INVENTORY_COUNTING,
              );

              this.setState({
                requestDocNum: response.data.docNum,
                successMsg: `Inventory Counting record #${response.data.docNum} has been created`,
                operation: displayModes.VIEW, //to hide Submit button,
                batchSerialsList,
              });
            }
          } else {
            this.setState({ warningMsg: "Something went wrong. Please try again after sometime" });
          }
        } else if (this.state.operation === displayModes.EDIT) {
          request.userId = localStorage.getItem("InternalKey");
          request.DocEntry = this.state.requestDocEntry;
          request.U_DraftStatus = status;
          request.U_RejectedReason = this.state.rejectReason;
          request.U_OriginatorId = this.state.originatorId;
          request.U_MultiLevelApproval = this.state.multiLevelApproval;
          request.U_ApprovalStatusId = this.state.approvalStatusId;
          request.U_ApprovalLevel = this.state.approvalLevel;

          response = await api.patch("/service/stock-transfer", request);
          const strDraftStatus = response.data.draftStatus;
          const noOfDays = parseInt(response.data.noOfDays);
          console.log("*** APPROVED response: " + JSON.stringify(response));

          if (response.data.stockResponse)
            console.log(
              "*** APPROVED stockResponse: " + JSON.stringify(response.data.stockResponse),
            );

          if (strDraftStatus) {
            let successMsg;
            if ([draftStatusList.APPROVED, draftStatusList.PENDING].includes(strDraftStatus)) {
              successMsg = "Request has been Approved!";

              //if the Draft has been approved within 3 days of Creation is prev. Approval date
              //display Confetti
              if (noOfDays > -1 && noOfDays <= 3) {
                realistic();
              }
            } else if (strDraftStatus === draftStatusList.REJECTED)
              successMsg = "Request has been rejected!";

            this.setState({
              //successMsg: response.data.message,
              requestStatus: strDraftStatus,
              successMsg,
              operation: displayModes.VIEW, //to hide Submit button
            });
            //await this.getGRPODraftList();
          }
        }
      } catch (error) {
        this.setState({
          warningMsg: error.response ? error.response.data.message : JSON.stringify(error.response),
          //operation: "NA" //to hide Submit button
        });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  async componentDidUpdate(prevProps, prevState) {
    //console.log("prevProp: "+ JSON.stringify(prevProps.operation))
    console.log("componentDidUpdate operation: " + this.state.operation);
    //console.log("prevState: "+ JSON.stringify(prevState.selectedStockTransReq))
    if (this.props.selectedStockTransReq !== null && prevProps.selectedStockTransReq === null) {
      //await this.getItemsList();
      await this.openTab();
    }
    console.log(
      "InventoryCountingDetails - componentDidUpdate - this.props.userRole: " + this.props.userRole,
    );
  }

  /**
   * Adds the Item selected from teh Items List popover to the itemsList
   * @param {*} scannedItem
   * @param {*} itemsListForTransfer
   * @returns
   */
  addSelectedItemToRow = (selectedItem, itemsListForTransfer) => {
    //To get teh selected Bin's BinAbsEntry, bcoz BinAbsEntry is not stored anywhere, only the Bin code
    //is saved in the state
    const selectedBin = this.state.binLocationList.find(
      (bin) => bin.BinCode === this.state.binCode,
    );

    let newItem = {
      ItemCode: selectedItem.ItemCode,
      WarehouseCode: this.state.warehouseCode,
      BinEntry: selectedBin.BinAbsEntry,
      BinCode: this.state.binCode,
      Counted: "tYES",
      CountedQuantity: 0,
      TargetType: -1,
      LineStatus: "clsOpen",
      CounterType: "ctUser",
      CounterID: localStorage.getItem("InternalKey"),

      //Based on below props I can identify Batch/Serial/Normal items n add validation in handleSave()
      /** NOTE:
       *  Batch Item: ManBtchNum = 'Y'
       *  Serial Item: ManSerNum = 'Y'
       *  Labor Item: InvntItem = 'N'
       *  Normal Item: ManBtchNum = 'N' & ManSerNum = 'N'
       */
      ManBtchNum: selectedItem.ManBtchNum,
      ManSerNum: selectedItem.ManSerNum,
      InvntItem: selectedItem.InvntItem,
    };
    if (selectedItem.ManBtchNum === "Y") {
      newItem.InventoryCountingBatchNumbers = [
        {
          BatchNumber: generateUniqueNumber(itemTypes.BATCHES),
          ItemCode: selectedItem.ItemCode,
        },
      ];
    } else if (selectedItem.ManSerNum === "Y") {
      newItem.InventoryCountingSerialNumbers = [
        {
          InternalSerialNumber: generateUniqueNumber(itemTypes.SERIAL_NUMBERS),
          ItemCode: selectedItem.ItemCode,
        },
      ];
    }

    itemsListForTransfer.push(newItem);
    this.setState({
      successMsg: `${selectedItem.ItemCode} has been successfully added!`,
    });
    this.clearToastMessage("successMsg");
    return itemsListForTransfer;
  };

  addScannedItemToRow = (scannedItem, itemsListForTransfer) => {
    // let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);
    let arrayProp;
    let newItem = {
      // LineNumber: 1,
      ItemCode: scannedItem.ItemCode,
      WarehouseCode: scannedItem.WhsCode,
      BinEntry: scannedItem.BinAbsEntry,
      BinCode: scannedItem.BinCode,
      Counted: "tYES",
      CountedQuantity: 0,
      TargetType: -1,
      LineStatus: "clsOpen",
      CounterType: "ctUser",
      CounterID: localStorage.getItem("InternalKey"),
    };
    if (scannedItem.BatchNumberProperty) {
      newItem.InventoryCountingBatchNumbers = [
        {
          BatchNumber: scannedItem.BatchNumberProperty,
          ItemCode: scannedItem.ItemCode,
          Quantity: parseFloat(scannedItem.OnHandQty),

          // BinEntry: scannedItem.BinAbsEntry,
          // BinCode: scannedItem.BinCode,
          // Quantity: 133.0,
          // BaseLineNumber: 1,
        },
      ];
      arrayProp = "InventoryCountingBatchNumbers";
    } else if (scannedItem.InternalSerialNumber) {
      newItem.InventoryCountingSerialNumbers = [
        {
          InternalSerialNumber: scannedItem.InternalSerialNumber,
          ItemCode: scannedItem.ItemCode,
          Quantity: parseFloat(scannedItem.OnHandQty),
          // Quantity: 133.0,
          // BaseLineNumber: 1,

          //Adding the Bin info., just in case it is required for 'Multi-Bin under a Batch' scenario
          // BinEntry: scannedItem.BinAbsEntry,
          // BinCode: scannedItem.BinCode
        },
      ];
      arrayProp = "InventoryCountingSerialNumbers";
    }

    itemsListForTransfer.push(newItem);

    //updated the Item level 'Counted Qty' or the Item that was just scanned/added
    itemsListForTransfer[itemsListForTransfer.length - 1].CountedQuantity = this.getTotalCountedQty(
      itemsListForTransfer[itemsListForTransfer.length - 1][arrayProp],
    );

    this.setState({
      successMsg: `${
        scannedItem.BatchNumberProperty
          ? scannedItem.BatchNumberProperty
          : scannedItem.InternalSerialNumber
      } has been successfully added!`,
    });
    this.clearToastMessage("successMsg");
    return itemsListForTransfer;
  };

  /**
   * Adds the scanned Batch/Serial# to appropriate Item
   * @param {Array} scannedBatchSerialRec Scanned Batch/Serial record
   * @param {Array} itemsListForTransfer  Array of Items, to which teh scanned rec. must be added
   * @param {Number} itemIndex            Index of the current item
   * @param {String} type                 Item Type- Batch or Serial
   * @returns
   */
  addBatchSerialToItem = (scannedBatchSerialRec, itemsListForTransfer, itemIndex, type) => {
    let arrayProp, newNumberProp, scannedNumberProp;
    if (type === itemTypes.BATCHES) {
      arrayProp = "InventoryCountingBatchNumbers";
      newNumberProp = "BatchNumber";
      scannedNumberProp = "BatchNumberProperty";
    } else if (type === itemTypes.SERIAL_NUMBERS) {
      arrayProp = "InventoryCountingSerialNumbers";
      newNumberProp = "InternalSerialNumber";
      scannedNumberProp = "InternalSerialNumber";
    }

    const index =
      // itemsListForTransfer[itemIndex].InventoryCountingBatchNumbers.findIndex(batch => {
      itemsListForTransfer[itemIndex][arrayProp].findIndex((batch) => {
        return batch[newNumberProp] === scannedBatchSerialRec[scannedNumberProp];
      });
    if (index > -1) {
      //If the same Batch/Serial# with same Bin is scanned more than once
      //NOTE: 2nd cond. added to allow users to add/scan a diff. Item that has the same Batch/Serial#
      //as another Item that's already added to 'row'
      if (
        itemsListForTransfer[itemIndex].BinEntry === scannedBatchSerialRec.BinAbsEntry &&
        itemsListForTransfer[itemIndex].ItemCode === scannedBatchSerialRec.ItemCode
      ) {
        this.setState({
          warningMsg: `${scannedBatchSerialRec[scannedNumberProp]} you are trying to add is already been added.
            Please try a different one!`,
        });
        this.clearToastMessage("warningMsg");
      }
      //if the same Batch/Serial# with diff. Bin is scanned, add it in a different 'row'
      else {
        itemsListForTransfer = this.addScannedItemToRow(
          scannedBatchSerialRec,
          itemsListForTransfer,
        );
      }
    }
    //If the Batch/Serial# is not already added
    else {
      // itemsListForTransfer[itemIndex].InventoryCountingBatchNumbers.push({
      itemsListForTransfer[itemIndex][arrayProp].push({
        [newNumberProp]: scannedBatchSerialRec[scannedNumberProp],
        ItemCode: scannedBatchSerialRec.ItemCode,
        Quantity: parseFloat(scannedBatchSerialRec.OnHandQty),
        // Quantity: 133.0,
        // BaseLineNumber: 1,

        // //Adding the Bin info., just in case it is required for 'Multi-Bin under a Batch' scenario
        // BinEntry: scannedBatchSerialRec.BinAbsEntry,
        // BinCode: scannedBatchSerialRec.BinCode
      });

      //updated the Item level 'Counted Qty'
      itemsListForTransfer[itemIndex].CountedQuantity = this.getTotalCountedQty(
        itemsListForTransfer[itemIndex][arrayProp],
      );

      this.setState({
        successMsg: `${scannedBatchSerialRec[scannedNumberProp]} has been successfully added!`,
      });
      this.clearToastMessage("successMsg");
    }
    return itemsListForTransfer;
  };

  /**
   * Adds the Scanned/User Entered (in case of items W QR Code) or Selected items (in case of 'old'
   * Items that don't have QR Code) to appropriate 'rows' in the Transfer table
   * @param {*} scannedBatchSerialRec  Batch or Serial rec.
   */
  handleItemScan = (scannedBatchSerialRec) => {
    console.log("handleItemScan - scannedBatchSerialRec: " + JSON.stringify(scannedBatchSerialRec));
    //Add the scanned item to the STrans if the scanned item's ItemCode & WhsCode matches
    //one of the items in the STrans Req.'s ItemCode & WhsCode

    let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);

    if (Array.isArray(itemsListForTransfer) && itemsListForTransfer.length > 0) {
      const itemIndex = itemsListForTransfer.findIndex(
        (item) => item.ItemCode === scannedBatchSerialRec.ItemCode,
      );

      if (itemIndex > -1) {
        //Batch Item
        if (itemsListForTransfer[itemIndex].InventoryCountingBatchNumbers) {
          itemsListForTransfer = this.addBatchSerialToItem(
            scannedBatchSerialRec,
            itemsListForTransfer,
            itemIndex,
            itemTypes.BATCHES,
          );
        }
        //Serial
        else if (itemsListForTransfer[itemIndex].InventoryCountingSerialNumbers) {
          itemsListForTransfer = this.addBatchSerialToItem(
            scannedBatchSerialRec,
            itemsListForTransfer,
            itemIndex,
            itemTypes.SERIAL_NUMBERS,
          );
        }
      } else {
        itemsListForTransfer = this.addScannedItemToRow(
          scannedBatchSerialRec,
          itemsListForTransfer,
        );
      }
      //If the BatchNumberProperty is not already added to the array, ie., if a Batch# is not scanned & added before
      /*if(!allAddItems.find(item => item.BatchNumber === scannedBatchSerialRec.BatchNumberProperty)) {
        const itemIndex = itemsListForTransfer.findIndex(item => {
          return item.ItemCode === scannedBatchSerialRec.ItemCode && item.BinCode === scannedBatchSerialRec.BinCode 
        });

        //Add the scanned Qty if the Item already exists or else add the Item to the array
        if(itemIndex > -1) {
          itemsListForTransfer[itemIndex].Quantity 
          = parseFloat(itemsListForTransfer[itemIndex].Quantity) +
            parseFloat(scannedBatchSerialRec.Quantity);

          this.setState({ successMsg: `${itemsListForTransfer[itemIndex].ItemCode}'s quantity has been updated!` });
          this.clearToastMessage("successMsg");
        }
        else {
          itemsListForTransfer.push(scannedBatchSerialRec);
          this.setState({ successMsg: `Item ${scannedBatchSerialRec.ItemCode} has been added successfully!` });
          this.clearToastMessage("successMsg");
        }
      }*/
    } else {
      itemsListForTransfer = this.addScannedItemToRow(scannedBatchSerialRec, itemsListForTransfer);
    }
    this.setState({ itemsListForTransfer });

    /*
    if(Array.isArray(this.state.itemsListForTransfer) && this.state.itemsListForTransfer.length) {
      // let warning = "warningMsg";
      // let success = "successMsg";
      //if the old Items Modal is opened, display all the Warning msgs in the Modal
      //instead of showing them on the screen underneath
      if(this.state.oldBatchSerialItemsPopup) {
        // warning = "oldItemsPopupWarningMsg";
        // success = "oldItemsPopupSuccessMsg";
      }
      let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);
      let scannedItem = {}, isTheScannedItemAdded = false, isTheScannedItemValid = false;
      let batchList = [], serialList = [];
      //loop through all the items and add teh scanned Item's Qty & Batch/Serial No. details to the
      //matching Item
      for(let i=0; i < itemsListForTransfer.length; i++) {
        // if(isTheScannedItemValid)
        //   break;
        scannedItem = {}; isTheScannedItemAdded = false;
        batchList = []; serialList = [];

        if(itemsListForTransfer[i].ItemCode === scannedBatchSerialRec.ItemCode
          //TODO: Need to uncommet this
          //Comenting this out for Testing purpose as FromWarehouse was coming a NULL, so recs. matched
          //when entering Batch#
          // && itemsListForTransfer[i].FromWarehouse === scannedBatchSerialRec.WhsCode
          ) {

          isTheScannedItemValid = true;
          //either AddedQuanity must be NaN. (it will be undefined initially) 
          //or 0 (it will be "0" when "1" Item is added & removed)
          //or it must be less than the Requested Quantity (Anish said Quantity can be more than teh 
          //req. Qty so I'm not checking that cond.)
          console.log("itemsListForTransfer[i].AddedQuantity: |"+ itemsListForTransfer[i].AddedQuantity+"|");
          if(isNaN(itemsListForTransfer[i].AddedQuantity)
            || parseInt(itemsListForTransfer[i].AddedQuantity) === 0
            // || itemsListForTransfer[i].AddedQuantity == "0"
            || parseInt(itemsListForTransfer[i].AddedQuantity) < parseInt(itemsListForTransfer[i].Quantity)) {
            // response.data[0].forEach(batchSerial => {
            console.log("itemsListForTransfer[i].ItemCode: "+ itemsListForTransfer[i].ItemCode);
            console.log("itemsListForTransfer[i].FromWarehouse: "+ itemsListForTransfer[i].FromWarehouse);
            console.log("scannedBatchSerialRec: "+ JSON.stringify(scannedBatchSerialRec));
            // if(itemsListForTransfer[i].ItemCode === scannedBatchSerialRec.ItemCode
            //   && itemsListForTransfer[i].FromWarehouse === scannedBatchSerialRec.WhsCode) {
            scannedItem = {
              BatchNumber: scannedBatchSerialRec.BatchNumberProperty ? scannedBatchSerialRec.BatchNumberProperty : "",
              InternalSerialNumber: scannedBatchSerialRec.InternalSerialNumber ? scannedBatchSerialRec.InternalSerialNumber : "",
              Quantity: parseInt(scannedBatchSerialRec.Quantity),
              //* NOTE: below prop will be used for comparison in handleQuantityChange() 
               //* method when user tries to change the scanned Qty.
              //* This will not be added in teh payload
              ScannedQuantity: parseInt(scannedBatchSerialRec.Quantity),
              BinCode: scannedBatchSerialRec.BinCode,
              BinEntry: scannedBatchSerialRec.BinAbsEntry
            }

            console.log("itemsListForTransfer[i].InventoryCountingBatchNumbers: "+ JSON.stringify(itemsListForTransfer[i].InventoryCountingBatchNumbers));
            //If the scanned item is a Batch item
            if(scannedItem.BatchNumber) {
              //'length' must be > than '0' bcoz if the last Batch under an Item is deleted then
              //this array will bcome empty [], not undefined (ELSE part will be executed only 
              //if is UNDEFINED, not [])
              if(Array.isArray(itemsListForTransfer[i].InventoryCountingBatchNumbers) 
                && itemsListForTransfer[i].InventoryCountingBatchNumbers.length) {
                batchList = itemsListForTransfer[i].InventoryCountingBatchNumbers;
                
                //using 'i' for this 'for' block was causing trouble when scanning & adding 2nd Item.
                //Already the above 'for' loop is using 'i'.
                //the 2nd got added to all the Items in the table
                //for(let b=0; b < batchList.length ; b++) {
                for(let b=0; b < batchList.length ; b++) {
                  if(batchList[b].BatchNumber === scannedItem.BatchNumber) {
                    this.setState({
                      successMsg: "",
                      warningMsg: "You can't add the same Batch No. twice. Please try a different one."
                    });
                    this.clearToastMessage("warningMsg");
                    break;
                  }
                  else {
                    //Add the scanned Item details to Trans. Item's Batch/Serial existing array
                    //NOTE: This was cause error
                    // itemsListForTransfer[i].InventoryCountingBatchNumbers.push(scannedItem);

                    batchList.push(scannedItem);
                    itemsListForTransfer[i].InventoryCountingBatchNumbers = batchList;
                    isTheScannedItemAdded = true;
                    break;
                  }
                }
              }
              //if 'InventoryCountingBatchNumbers' array is undefined (which will be teh case initally)
              //add the scanned details this way
              else {
                //Didnt work!Threw error
                // itemsListForTransfer[i].InventoryCountingBatchNumbers = [];
                // itemsListForTransfer[i].InventoryCountingBatchNumbers.push(scannedItem);

                batchList.push(scannedItem);
                itemsListForTransfer[i].InventoryCountingBatchNumbers = batchList;
                isTheScannedItemAdded = true;
              }
            }
            else if(scannedItem.InternalSerialNumber) {
              if(Array.isArray(itemsListForTransfer[i].InventoryCountingSerialNumbers) 
                && itemsListForTransfer[i].InventoryCountingSerialNumbers.length) {
                serialList = itemsListForTransfer[i].InventoryCountingSerialNumbers;

                //this was causing prob. when scanning & adding 2nd Item
                // for(let i=0; i < serialList.length ; i++) {
                for(let s=0; s < serialList.length ; s++) {
                  if(serialList[s].InternalSerialNumber === scannedItem.InternalSerialNumber) {
                    this.setState({
                      successMsg: "",
                      warningMsg: "You can't add the same Serial No. twice. Please try a different one."
                    });
                    this.clearToastMessage("warningMsg");
                    break;
                  }
                  else {
                    //Add the scanned Item details to Trans. Item's Batch/Serial existing array
                    serialList.push(scannedItem);
                    itemsListForTransfer[i].InventoryCountingSerialNumbers = serialList;
                    isTheScannedItemAdded = true;
                    break;
                  }
                }
              }
              else {
                //if 'InventoryCountingSerialNumbers' array is undefined (which will be teh case initally)
                //add the scanned details this way
                // itemsListForTransfer[i].InventoryCountingSerialNumbers = [];
                // itemsListForTransfer[i].InventoryCountingSerialNumbers.push(scannedItem);

                serialList.push(scannedItem);
                itemsListForTransfer[i].InventoryCountingSerialNumbers = serialList;
                isTheScannedItemAdded = true;
              }
            }
            //Update the AddedQuanity if the scanned item is added to the Items table
            if(isTheScannedItemAdded) {
              //update AddedQuantity. set the value if it is the 1st scanned item or add the qty to teh 
              //existing value
              //NOTE, this custom field is only for validation purpose, it will not be sent to the API
              if(isNaN(itemsListForTransfer[i].AddedQuantity)) {
                // || parseInt(itemsListForTransfer[i].AddedQuantity) === 0
                itemsListForTransfer[i].AddedQuantity = parseInt(scannedBatchSerialRec.Quantity);
              }
              else {
                itemsListForTransfer[i].AddedQuantity
                  = parseInt(itemsListForTransfer[i].AddedQuantity) + parseInt(scannedBatchSerialRec.Quantity);
              }
              //break the loop once the scanned item is added to a Row with matching Item & WH
              break;
            }
            // isTheScannedItemValid = true;
          }
          else {
            this.setState({
              successMsg: "",
              warningMsg: "Required quantity has already been added for Item "+ itemsListForTransfer[i].ItemCode,
              batchSerialNo: ""
            });
            this.clearToastMessage("warningMsg");
            break;
          }
        }
      }
      if(!isTheScannedItemValid) {
        this.setState({
          warningMsg: "The item you attempted to add doesn't match any of the items in the below table. "
          + "Or the entered item's WH doesn't match the From WH in the request.",
          batchSerialNo: ""
        });
        this.clearToastMessage("warningMsg");
      }
      else {
        this.setState({
          itemsListForTransfer,
          //this msg Doesn't disapper even if the Same batch# is added twice,
          //no warnign msg is shown if this is presnet, so not using it now
          successMsg: "Item added successfully!",
          batchSerialNo: ""
        });
        this.clearToastMessage("successMsg");
      }

      //this will be used to check/uncheck checkbox in the 'old' items modal
      return isTheScannedItemAdded;
    }*/
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    console.log("InventoryCountingDetails - componentDidMount");
    this._isMounted = true;
    if (this.props.selectedStockTransReq !== null) {
      //await this.getItemsList();
      await this.openTab();
    }
    console.log(
      "InventoryCountingDetails - componentDidMount - this.props.userRole: " + this.props.userRole,
    );
    console.log(
      "InventoryCountingDetails - componentDidMount - this.props.operation: " +
        this.props.operation,
    );

    /*
    const binLocationList = await this.getBinsAndItemQtyForWarehouse("BINS", this.state.toWarehouse);
    this.setState({ binLocationList });

    if(!Array.isArray(this.state.filteredItemsList) || !this.state.filteredItemsList.length > 0) {
      await this.loadDropdownList("item");
    } */
    if (!Array.isArray(this.state.warehouseList) || !this.state.warehouseList.length > 0) {
      // await this.loadDropdownList("WAREHOUSE");
    }
    /*if(!Array.isArray(this.state.normalItemsList) || !this.state.normalItemsList.length > 0) {
      await this.getNormalItemsList();
    } */
  }

  render() {
    const { operation } = this.state;
    let itemsTableHead = [
      "#",
      // "Item Description",
      "Item No.",
      "Warehouse",
      "Bin Loc.",
      "Counted Qty",
    ];

    if (this.state.operation === displayModes.CREATE) {
      itemsTableHead.unshift("Del.");
    }

    let displayMode = mode.DISABLED;
    if (
      this.props.userRole == userRoles.APPROVER &&
      this.state.requestStatus == draftStatusList.PENDING
    ) {
      displayMode = mode.NORMAL;
    }
    console.log("operation: " + operation);
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
                  <Col sm="6" md="4">
                    <h3 className="mb-0 mt--3">
                      Inventory Counting{" "}
                      {this.props.selectedStockTransReq
                        ? "#" + this.props.selectedStockTransReq.DocEntry
                        : ""}
                    </h3>
                  </Col>
                  <Col className="text-right" sm="8">
                    {this.state.isLoading ? (
                      <>
                        <i className="fa fa-info-circle text-blue" /> &nbsp;
                        <small className="text-primary">Loading please wait...&emsp;</small>
                        <Spinner size="sm" color="primary" className="reload-spinner mr-4" />
                      </>
                    ) : (
                      /* Replaced below with <Toast>
                        : this.state.warningMsg ?
                        <span className="text-warning mr-5 small">
                          <i className="fa fa-exclamation-triangle" /> &nbsp;
                          {this.state.warningMsg}
                        </span>
                        : this.state.successMsg ? 
                          <span className="text-success mr-5 small">
                            <i className="fa fa-info-circle" /> &nbsp;
                            {this.state.successMsg}
                          </span>
                        */
                      displayMode == mode.NORMAL && (
                        <>
                          <Button
                            size="sm"
                            color="primary"
                            type="button"
                            onClick={(e) => this.handleSave(e, draftStatusList.APPROVED)}
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
                    {!this.state.isLoading &&
                      this.state.operation === displayModes.CREATE &&
                      Array.isArray(this.state.itemsListForTransfer) &&
                      this.state.itemsListForTransfer.length > 0 && (
                        <Button
                          size="sm"
                          //className="ml-auto" //this will move the 'Save' button to the left side of the modal
                          color="primary"
                          type="button"
                          onClick={(e) => this.handleSave(e)}
                        >
                          Submit
                        </Button>
                      )}
                    {
                      Array.isArray(this.state.batchSerialsList) &&
                        this.state.batchSerialsList.length > 0 && (
                          <PreviewPrintQRCodes
                            className="mt-0"
                            batchSerialsList={this.state.batchSerialsList}
                            batchNumberProperty={itemTypeProperties.BATCH_NUMBER}
                            internalSerialNumber={itemTypeProperties.SERIAL_NUMBER}
                            quantity="Quantity"
                            enableBatchSerialNo={true}
                            enableItemCode={true}
                            enableQty={false}
                          />
                        )
                      // <Button
                      //   color="primary"
                      //   // href="#"
                      //   size="sm"
                      //   onClick={() => this.handleViewQRCodes()}
                      //   className="ml-2 cursor-pointer"
                      // >
                      //   View QR Codes
                      // </Button>
                    }
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="mt--3">
                {/** <div className="pl-lg-3 pr-lg-3 mt--1 mb-2"> */}
                <h6 className="heading-small text-muted mb-3">Inventory Counting Information</h6>
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow-xl">
                  {" "}
                  {/** text-center */}
                  <Row>
                    {/* Display the Branch info only when Multiple Branches are configured */}
                    {isMultiBranchEnabled && (
                      <Col md="3">
                        <BranchDropdown
                          label="Branch"
                          handleChange={this.handleBranchChange}
                          // disabled={this.state.displayMode === displayModes.VIEW}
                          disabled={
                            this.state.operation === displayModes.CREATE
                              ? false
                              : displayMode == mode.DISABLED
                                ? true
                                : false
                          }
                        />
                      </Col>
                    )}
                    {operation === displayModes.CREATE && (
                      <>
                        <Col md="3">
                          <small className="text-muted">Warehouse</small>
                          <div className="mt-1 mb-3">
                            <Input
                              bsSize="sm"
                              type="select"
                              name="select"
                              className={
                                "form-control display-4 text-gray-dark " +
                                this.state.invalidInput.toWarehouse
                              }
                              value={this.state.warehouseCode}
                              //style={{ width: "auto" }} //width: 100
                              onChange={(event) => this.handleWarehouseChange(event.target.value)}
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
                        <Col md="3" className="mt-1">
                          {/* <small className="text-muted">Bin Location</small>
                            <div className="mt-1 mb-3">
                              <Input bsSize="sm"
                                id="toBinLocation"
                                type="select"
                                name="select"
                                className={"form-control display-4 text-gray-dark "
                                  + this.state.invalidInput.toBinLocation}
                                value={this.state.binCode}
                                //style={{ width: "auto" }} //width: 100
                                onChange={(e) => this.handleBinChange(e.target.value)}
                              >
                                <option value="">-- Select a Bin --</option>
                                {Array.isArray(this.state.binLocationList) && this.state.binLocationList.length > 0
                                  && this.state.binLocationList.map((bin, key) => {
                                  return (
                                    <option
                                      key={bin.BinCode}
                                      value={bin.BinCode}
                                    >
                                      {bin.BinCode}
                                    </option>
                                  )
                                })}
                              </Input>
                            </div> */}
                          <BinLocationDropdown
                            label="Bin Location"
                            warehouseCode={this.state.warehouseCode}
                            handleBinChange={this.setBinLocationDetails}
                            // handleBinReset={this.handleBinReset}
                            // resetClearInput={this.resetClearInput}
                          />
                        </Col>
                      </>
                    )}
                    {this.state.operation === displayModes.CREATE && (
                      <Col md="3">
                        <ScanAndSearchBatchSerialItems
                          // isAllAreNormalItems={this.state.isAllAreNormalItems}
                          itemsList={this.state.itemsListForTransfer}
                          addScannedBatchSerialItemToRow={this.handleItemScan}
                          handleDeleteBatchSerial={this.handleDeleteBatchSerial}
                          userRole={this.props.userRole}
                          operation={this.props.operation}
                          showOldItemsModal={false}
                          isBinCodeRequired={true}
                          binCode={this.state.binCode}
                        />
                      </Col>
                    )}
                    {/* </Row>
                    <Row> */}
                    <Col md="2">
                      <small className="text-muted">Counting Date</small>
                      <h4 className="mt-1">{this.state.countingDate}</h4>
                    </Col>
                    <Col md="2">
                      <small className="text-muted">Counting Time</small>
                      <h4 className="mt-1">{this.state.countingTime}</h4>
                    </Col>

                    <Col md={this.state.operation === displayModes.CREATE ? "5" : "5"}>
                      <small className="text-muted">Remarks</small>
                      <FormGroup className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          rows="2"
                          type="textarea"
                          value={this.state.comments}
                          className={
                            "form-control display-4 text-gray-dark " +
                            this.state.invalidInput.comments
                          }
                          id="input-vendor-remarks"
                          placeholder="Enter Remarks"
                          onChange={(e) => this.setState({ comments: e.target.value })}
                          disabled={
                            this.state.operation === displayModes.CREATE
                              ? false
                              : displayMode == mode.DISABLED
                                ? true
                                : false
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </Card>
                {/* Item Details */}
                <Row className="align-items-center">
                  <Col xs="5">
                    <h6 className="heading-small text-muted mb-4">Item Details</h6>
                  </Col>
                  {
                    /** Display teh button only when Bin Code is selected */
                    this.state.operation === displayModes.CREATE && this.state.binCode && (
                      <Col xs="7" className="mb-4 text-right">
                        <Button
                          size="sm"
                          color="primary"
                          type="button"
                          onClick={() => this.toggleModal("itemListPopup")}
                        >
                          Search & Add Items
                        </Button>
                      </Col>
                    )
                  }
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
                              <th scope="col" key={key}>
                                {headerCol}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(this.state.itemsListForTransfer) &&
                        this.state.itemsListForTransfer.length
                          ? this.state.itemsListForTransfer.map((item, itemKey) => {
                              return (
                                <>
                                  <tr key={item.ItemCode} id={"trId" + itemKey}>
                                    {this.state.operation === displayModes.CREATE && (
                                      <td>
                                        <span
                                          id={"itemRemoval-" + itemKey}
                                          className="btn-inner--icon mt-1 cursor-pointer"
                                          // style={{cursor: "pointer"}}
                                          onClick={() => this.handleRemoveItem(itemKey)}
                                        >
                                          <i className="fa fa-trash text-red" />
                                        </span>
                                      </td>
                                    )}
                                    <td>{itemKey + 1}</td>
                                    {/* <th scope="row" style={{ whiteSpace: "unset" }}>
                                      {item.ItemName}
                                    </th> */}
                                    <td>{item.ItemCode}</td>
                                    <td>
                                      {item.WarehouseCode
                                        ? this.getWarehouseName(item.WarehouseCode)
                                        : "NA"}
                                    </td>
                                    {/* <td>{item.U_FromBinLoc}</td> */}
                                    {/* Bin Locations */}
                                    <td>{item.BinCode}</td>
                                    {/* <td>{item.BinEntry}</td> */}
                                    {/** TODO: Need to let user enter CountedQty for Normal & Labor items */}
                                    <td>{item.CountedQuantity ? item.CountedQuantity : ""}</td>
                                  </tr>

                                  {Array.isArray(item.InventoryCountingBatchNumbers) &&
                                  item.InventoryCountingBatchNumbers.length
                                    ? item.InventoryCountingBatchNumbers.map((batch, batchKey) => {
                                        return (
                                          <>
                                            {batchKey === 0 ? (
                                              <tr key={0} style={{ backgroundColor: "#f6f8f9" }}>
                                                {/** fd737314 mild Orange*/}
                                                <td style={{ backgroundColor: "#fff" }}></td>
                                                <td>...</td>
                                                <td>
                                                  <b>Batch#</b>
                                                </td>
                                                <td>
                                                  <b>Quantity</b>
                                                </td>
                                                {/* <td><b>Bin Loc.</b></td> */}
                                              </tr>
                                            ) : null}
                                            <tr key={batch.BatchNumber}>
                                              <td></td>
                                              {/* <td>{batchKey+1 +"-"+ batch.BinEntry}</td> */}
                                              <td>
                                                {operation === displayModes.CREATE &&
                                                  item.InventoryCountingBatchNumbers.length > 1 && (
                                                    <Trash2
                                                      id={`batch_${batch.batchKey}`}
                                                      size={20}
                                                      className="mr-1 pb-1 text-danger cursor-pointer"
                                                      //onClick={() => this.handleDelete(group.U_GroupId)}
                                                      onClick={() =>
                                                        this.handleDeleteBatchSerial(
                                                          itemTypes.BATCHES,
                                                          itemKey,
                                                          batchKey,
                                                        )
                                                      }
                                                    />
                                                  )}
                                              </td>
                                              <td>{batch.BatchNumber}</td>
                                              <td>
                                                {operation === displayModes.CREATE ? (
                                                  <Input
                                                    bsSize="sm"
                                                    style={{ width: 35 + "%" }}
                                                    value={batch.Quantity}
                                                    className={"form-control"} // display-4 text-gray-dark
                                                    placeholder=""
                                                    type="number"
                                                    onChange={(e) =>
                                                      this.handleQuantityChange(
                                                        itemTypes.BATCHES,
                                                        e.target.value,
                                                        itemKey,
                                                        batchKey,
                                                      )
                                                    }
                                                  />
                                                ) : (
                                                  parseFloat(batch.Quantity).toFixed(2)
                                                )}
                                              </td>
                                              {/* <td>{batch.BinCode}</td> */}
                                            </tr>
                                          </>
                                        );
                                      })
                                    : null}
                                  {Array.isArray(item.InventoryCountingSerialNumbers) &&
                                  item.InventoryCountingSerialNumbers.length
                                    ? item.InventoryCountingSerialNumbers.map(
                                        (serial, serialKey) => {
                                          return (
                                            <>
                                              {serialKey === 0 ? (
                                                <tr key={0} style={{ backgroundColor: "#f6f8f9" }}>
                                                  <td style={{ backgroundColor: "#fff" }}></td>
                                                  <td>...</td>
                                                  <td>
                                                    <b>Serial#</b>
                                                  </td>
                                                  <td>
                                                    <b>Quantity</b>
                                                  </td>
                                                  {/* <td><b>From Bin Loc.</b></td> */}
                                                </tr>
                                              ) : null}
                                              <tr key={serial.InternalSerialNumber}>
                                                <td></td>
                                                <td>
                                                  {operation === displayModes.CREATE &&
                                                    item.InventoryCountingSerialNumbers.length >
                                                      1 && (
                                                      <Trash2
                                                        id={`serial_${serial.serialKey}`}
                                                        size={20}
                                                        className="mr-1 pb-1 text-danger cursor-pointer"
                                                        //onClick={() => this.handleDelete(group.U_GroupId)}
                                                        onClick={() =>
                                                          this.handleDeleteBatchSerial(
                                                            itemTypes.SERIAL_NUMBERS,
                                                            itemKey,
                                                            serialKey,
                                                          )
                                                        }
                                                      />
                                                    )}
                                                </td>
                                                <td>{serial.InternalSerialNumber}</td>
                                                <td>{serial.Quantity}</td>
                                                {/* <td>
                                            {operation === displayModes.CREATE ?
                                              <Input
                                                bsSize="sm"
                                                style={{ width: 35 + "%" }}
                                                value={serial.Quantity}
                                                className={"form-control"} // display-4 text-gray-dark 
                                                placeholder=""
                                                type="number"
                                                onChange={(e) =>
                                                  this.handleQuantityChange(itemTypes.SERIAL_NUMBERS, e.target.value, itemKey, serialKey)}
                                              />
                                            : parseFloat(serial.Quantity).toFixed(2)
                                            }
                                          </td> */}
                                                {/* <td>{serial.BinCode}</td> */}
                                              </tr>
                                            </>
                                          );
                                        },
                                      )
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

        {/** All Items popup */}
        {this.state.itemListPopup && (
          <VirtualizedItemsList
            itemListPopup={this.state.itemListPopup}
            handleItemSelection={this.handleItemSelection}
            toggleModal={this.toggleModal}
          />
        )}

        {/** Rejection Popup */}
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
                id="input-vendor-rejectReason"
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
              onClick={(e) => this.handleSave(e, draftStatusList.REJECTED)}
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
        {this.state.warningMsg ? (
          <Toast className="toast bottom-right" isOpen={this.state.warningMsg}>
            <div className="toast-header toast-warning text-white">
              <strong className="mr-auto ">
                <i className="fa fa-exclamation-triangle" /> &nbsp;Warning
              </strong>
              <button
                type="button"
                className="ml-2 close"
                data-dismiss="toast"
                aria-label="Close"
                onClick={() => this.setState({ warningMsg: "" })}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <ToastBody className="text-white toast-body">
              <span className="text-warning mr-20">{this.state.warningMsg}</span>
            </ToastBody>
          </Toast>
        ) : (
          this.state.successMsg && (
            <Toast className="toast bottom-right" isOpen={this.state.successMsg}>
              <div className="toast-header toast-success text-white">
                <strong className="mr-auto ">
                  <i className="fa fa-info-circle" /> &nbsp;Success
                </strong>
                <button
                  type="button"
                  className="ml-2 close"
                  data-dismiss="toast"
                  aria-label="Close"
                  onClick={() => this.setState({ successMsg: "" })}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <ToastBody className="text-white text-left toast-body">
                <span className="text-success mr-20">{this.state.successMsg}</span>
              </ToastBody>
            </Toast>
          )
        )}
        {this.state.infoMsg && (
          <Toast className="toast center-left" isOpen={this.state.infoMsg}>
            <div className="toast-header toast-primary text-white">
              <strong className="mr-auto ">
                <i className="fa fa-info-circle" /> &nbsp;Info
              </strong>
              <button
                type="button"
                className="ml-2 close"
                data-dismiss="toast"
                aria-label="Close"
                onClick={() => this.setState({ infoMsg: "" })}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <ToastBody className="text-white text-left toast-body">
              <span
                className="text-primary mr-10"
                dangerouslySetInnerHTML={{ __html: this.state.infoMsg }}
              />
            </ToastBody>
          </Toast>
        )}
      </>
    );
  }
}
export default InventoryCountingDetails;

InventoryCountingDetails.propTypes = {
  operation: PropTypes.string.isRequired,
  //selectedStockTransReq: PropTypes.object.isRequired,
  //setGRPODraftDetails: PropTypes.func.isRequired
};
