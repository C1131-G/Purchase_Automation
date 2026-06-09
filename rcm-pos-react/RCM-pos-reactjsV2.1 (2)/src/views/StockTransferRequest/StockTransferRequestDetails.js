//StockTransferRequestDetails.23 b4 Resubmit REJECTED recs

import React from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import cloneDeep from "lodash.clonedeep";
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
} from "reactstrap";

import api from "../../config/api-nodejs";
import VirtualizedItemsList from "../components/VirtualizedItemsList";
import BranchDropdown from "../components/BranchDropdown";

//for Mock API
import axios from "axios";
import { scrollToElement, formatDate, showWarningMsg } from "../../config/util.js";
import { realistic, fireworks } from "../../util/confetti";
import {
  userRoles,
  draftStatus,
  apiURIs,
  portalModules,
  isMultiBranchEnabled,
  requestComment,
} from "../../config/config.js";
import SalesEmployeeDropdown from "../components/SalesEmployeeDropdown";
// import "../../assets/css/custom-style.css";
// import "./popover.scss";
import { UserPermissionsContext } from "../../contexts/UserPermissionsContext";

const mode = {
  NORMAL: "NORMAL",
  DISABLED: "DISABLED",
};
const today = new Date();

class StockTransferRequestDetails extends React.Component {
  static contextType = UserPermissionsContext;
  _isMounted = false;
  state = {
    branch: isMultiBranchEnabled ? "" : 1, //Set default branch when multi-branch is not set
    error: "",
    warningMsg: "",
    operation: this.props.operation,

    //had to remove this line from openTab & add it here for the 'status' to set properly for AUTO_APPROVED recs.
    requestStatus: this.props.selectedStockTransReq
      ? this.props.selectedStockTransReq.U_DraftStatus
      : "",
    requestDate: formatDate(today, "MMM D, YYYY"),
    warehouseList: [],
    fromWarehouseList: [],
    fromWarehouse: "",
    fromWarehouseLocation: "",
    toWarehouse: "",
    allItemsList: [],
    filteredItemsList: [],
    itemsListForTransfer: [],
    clearSelectedItem: false, //props for <AutoComplete> to remove Item

    itemListPopup:
      this.props.operation === "Create" && !this.props.selectedProductionOrder ? true : false, //Display itemList only when the operation is "CREATE"
    //& if the user is NOT navigated from PO screen
    invalidRowFromWarehouse: [],
    invalidInput: {},
    availableQuantityPopOver: [],
    availableQuantityInBinPopOver: [],
    fromWarehousePopover: false,
    tempFromWarehouse: "",

    toBinLocation: "",
    tempToBinLocation: "",
    toBinHeaderConfirmationPopOver: false,
    toBinListPopOver: [],
    binLocationList: [
      { BinCode: "A-1-A-0-S1", BinName: "B1" },
      { BinCode: "B-1-A-0", BinName: "A1" },
    ],

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
    salesEmployee: "",
  };

  toggleModal = (name) => {
    console.log("toggleModal");
    /**
     * Added cond. to check Component "mounted" status to fix below warning 
     *    Warning: Can't perform a React state update on an unmounted component.
     *    This is a no-op, but it indicates a memory leak in your application.
     *    To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
    in StockTransferRequestDetails (at GRPODraftDetails.js:62)
    in Suspense (at GRPODraftDetails.js:61)
    */
    //replace filtered Items with All Items list when closing the Items List popup
    if (name === "itemListPopup" && this.state[name]) {
      console.log("itemListPopup");
      this.setState({
        // filteredItemsList : [...this.state.allItemsList],
        // virtualTableWarningMsg: ""
      });
    }
    if (this._isMounted) {
      this.setState({
        [name]: !this.state[name],
      });
    }
  };

  togglePopover = (name) => {
    this.setState({ [name]: !this.state[name] });
  };

  handleHeaderFieldChange = (name, value) => {
    this.setState({ [name]: value });
  };

  toggleAvailableQuantityPopOver = (type, key) => {
    //isOpen
    console.log("toggleAvailableQuantityPopOver - key: " + key);
    if (type === "WAREHOUSE") {
      let availableQuantityPopOver = [...this.state.availableQuantityPopOver];
      availableQuantityPopOver[key] = availableQuantityPopOver[key] ? false : true;

      // let availableQuantityPopOver = [];
      // availableQuantityPopOver[key] = isOpen;

      console.log("availableQuantityPopOver: " + JSON.stringify(availableQuantityPopOver));
      this.setState({
        availableQuantityPopOver,
      });
    } else if (type === "BIN_LOCATION") {
      let availableQuantityInBinPopOver = [...this.state.availableQuantityInBinPopOver];
      availableQuantityInBinPopOver[key] = availableQuantityInBinPopOver[key] ? false : true;

      console.log(
        "availableQuantityInBinPopOver: " + JSON.stringify(availableQuantityInBinPopOver),
      );
      this.setState({ availableQuantityInBinPopOver });
    }
  };

  /**
   * Reset the Warehouse, Location & Bin Location details all the item
   */
  resetItemWarehouseBinDetails = () => {
    let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);
    // itemsListForTransfer.forEach(item => {
    //   if(item.U_FromWarehouse) {
    //     item.U_FromWarehouse = "";
    //   }
    //   else if(item.FromWarehouse) {
    //     item.FromWarehouse = "";
    //   }
    //   item.availableQuantityInBins ="";
    //   item.U_FromWarehouse = "";
    //   item.fromWarehouseLocation = [];
    //   item.allWarehouseAvailableQtyList = [],
    //   item.availableQuantity = "";
    // });

    //Reset all the Row level WHs & Available Qtys
    itemsListForTransfer.forEach((item) => {
      item.U_FromWarehouse = ""; //warehouseCode;
      item.FromWarehouse = "";
      item.fromWarehouseLocation = "";
      item.availableQuantity = "";
      //reset below Bin related values whenever WH is changed
      item.U_FromBinLoc = "";
      item.availableQuantityInBin = 0;
      item.availableQuantityInBins = [];
    });
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
      this.resetItemWarehouseBinDetails();
      await this.loadDropdownList("WAREHOUSE", branch);
    } else {
      this.setState({ branch: "", warehouseList: [], binLocationList: [], isLoading: false });
      this.resetItemWarehouseBinDetails();
    }
  };

  /**
   *
   * @param {Number} key
   * @param {String} binCode
   */
  handleRowLevelBinChange = async (key, binCode, availableQuantity) => {
    this.setState({ warningMsg: "" });
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    itemsListForTransfer[key].U_FromBinLoc = binCode;
    itemsListForTransfer[key].availableQuantityInBin = availableQuantity;
    this.toggleAvailableQuantityPopOver("BIN_LOCATION", key);
  };

  toggleRowLevelToBinPopOver = (key) => {
    console.log("toggleRowLevelToBinPopOver - key: " + key);
    let toBinListPopOver = [...this.state.toBinListPopOver];
    toBinListPopOver[key] = toBinListPopOver[key] ? false : true;

    console.log("toBinListPopOver: " + JSON.stringify(toBinListPopOver));
    this.setState({ toBinListPopOver });
  };

  /**
   * Update Quantity and other values changed in the Items Table
   * @param {String} fieldName  Column Name
   * @param {String} value      Selected value
   * @param {Number} key        Index
   */
  handleFieldChange = (fieldName, value, key) => {
    this.setState({ warningMsg: "" });
    if ((fieldName === "Quantity") & (value > -1)) {
      let itemsListForTransfer = [...this.state.itemsListForTransfer];

      // if(value > parseFloat(itemsListForTransfer[key].availableQuantity)) {
      //   this.setState({ warningMsg: "Quantity cannot be greater than the available quantity in the Warehouse" });
      // }
      // else {
      itemsListForTransfer[key][fieldName] = value;
      this.setState({ itemsListForTransfer });
      // }
    }
  };

  /**
   * Removes selected item from the Transfer request
   * @param {Number} key  Index of the item in the array
   */
  handleRemoveItem = (key) => {
    this.setState({ warningMsg: "" });
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    const removedItemCode = itemsListForTransfer[key].ItemCode;
    itemsListForTransfer.splice(key, 1);

    /* This is not required as I have replaed the checkboxes in teh popup with Plus icon
    let allItemsList = [...this.state.allItemsList];
    allItemsList.forEach(item => {
      if(item.ItemCode === removedItemCode) {
        item.selected = false;
      }
    });*/
    //filteredItemsList //NOTE: No need to set 'selecte' false in this list, updating allItemsList will do

    this.setState({ itemsListForTransfer }); //, allItemsList
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

  handleAddItem = () => {
    const length = this.state.itemsListForTransfer.length;
    const itemsListForTransfer = this.state.itemsListForTransfer.slice();
    let nextLineNum = 0;
    if (length > 0) {
      //current length will be the next index in the array
      nextLineNum = length;
    }
    itemsListForTransfer.push({
      LineNum: nextLineNum,
      ItemCode: "",
      Quantity: "",
      //UOM: ""
    });
    this.setState({ itemsListForTransfer });
  };

  handleViewQRCodes = async () => {
    let normalItemsList = [],
      batchItemsList = [],
      serialNoItemsList = [],
      item = {};
    const { itemsListForTransfer } = this.state;

    itemsListForTransfer.map((item, key) => {
      console.log("handleViewQRCodes item.BatchNumbers: " + JSON.stringify(item.BatchNumbers));
      if (Array.isArray(item.BatchNumbers) && item.BatchNumbers.length) {
        item.BatchNumbers.map((batch) => {
          console.log("batch: " + JSON.stringify(batch));
          item = {}; //need to reset it each time or the 1st rec.'s value is set for all items
          item.ItemCode = item.ItemCode;
          item.BatchNumberProperty = batch.BatchNumberProperty;
          item.Quantity = batch.Quantity;

          batchItemsList.push(item);
        });
      } else if (Array.isArray(item.SerialNumbers) && item.SerialNumbers.length) {
        item.SerialNumbers.map((batch) => {
          item = {};
          item.ItemCode = item.ItemCode;
          item.InternalSerialNumber = batch.InternalSerialNumber;
          item.Quantity = batch.Quantity;

          serialNoItemsList.push(item);
        });
      } else if (Array.isArray(item.SerialNumbers) && item.SerialNumbers.length) {
        item.SerialNumbers.map((batch) => {
          item = {};
          item.ItemCode = item.ItemCode;
          item.InternalSerialNumber = batch.InternalSerialNumber;
          item.Quantity = batch.Quantity;

          serialNoItemsList.push(item);
        });
      }
    });
    this.setState({
      normalItemsList,
      batchItemsList,
      serialNoItemsList,
    });

    //this.toggleModal("qrCodesPopup");
    //values to be passed parent comp. from where they will be sent to <QRCodes> comp.
    this.props.setQRCodeDetails(
      4,
      this.state.requestDocEntry,
      normalItemsList,
      batchItemsList,
      serialNoItemsList,
    );
  };

  /**
   * Gets all Items for the selected STR
   */
  getItemsList = async (docEntry) => {
    console.log(
      "StockTransferDetails - getItemsList(): this.state.requestStatus" + this.state.requestStatus,
    );
    //If ItemsList if not available yet, get it from the api
    if (!this.state.itemsListForTransfer.length) {
      this.setState({ isLoading: true });
      let uri;

      if (this.props.selectedProductionOrder) {
        uri = `/custom/${apiURIs[portalModules.PRODUCTION_ORDER]}/rows/${docEntry}`;
      } else {
        //For direct STRs
        if (this.state.requestStatus === draftStatus.AUTO_APPROVED) {
          uri = `/custom/${apiURIs[portalModules.STOCK_TRANSFER_REQUEST]}/rows/direct/${docEntry}`;
        }
        //For Drafts
        else {
          uri = `/custom/${apiURIs[portalModules.STOCK_TRANSFER_REQUEST]}/rows/draft/${docEntry}`;
        }
      }

      try {
        //pass the "type" as "rows" & Drafts's DocEntry to the API to pull the Item Rows
        const response = await api.get(uri, {
          params: { userId: localStorage.getItem("InternalKey") },
        });
        let itemsListForTransfer = response.data.rows;
        console.log(`STR getItemsList List: ${JSON.stringify(itemsListForTransfer)}`);
        if (response.data && Array.isArray(itemsListForTransfer) && itemsListForTransfer.length) {
          itemsListForTransfer.forEach((item) => {
            item.fromWarehouseLocation = item.FromWarehouse
              ? this.getFromWarehouseLocation(item.FromWarehouse)
              : this.getFromWarehouseLocation(item.U_FromWarehouse);

            if (this.props.selectedProductionOrder) {
              //Copy Planned Qty from Prod. Order to Quantity field
              item.Quantity = item.PlannedQty;
            }
          });
          if (this.props.selectedProductionOrder) {
            //set Available Qty Info for all Items from all 'portal' WHs
            await this.getAvailableQtyForAllItems(itemsListForTransfer);
          } else {
            this.setState({
              // actualDraftStatus: response.data.draftStatus,
              itemsListForTransfer,
            });
          }
        }
      } catch (err) {
        console.log("error:" + JSON.stringify(err.response));
        // this.setState({ warningMsg: error.response.data.message });
        if (err.response) this.setState({ warningMsg: err.response.data.message });
        else if (err.message) this.setState({ warningMsg: err.message });
        else this.setState({ warningMsg: JSON.stringify(err) });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  handleCheckboxChange = (name) => (event) => {
    const value = event.target.checked;
    this.setState({ [name]: value ? "Y" : "N" });
  };

  /**
   * Clears selected Item Desc. in the auto-complete textbox, clears current Item info from "state"
   * and calls getCallDetails()
   * This funct. is invoked when clearing Item Desc. using "X"
   */
  resetClearInput = (key) => {
    this.setState({
      clearSelectedItem: false,
      customerId: null,
      custShortName: null,
    });
  };

  /**
   * Called from AutoComplete component.
   * Sets "customerId" as NULL when a value is removed from AutoComplete box
   * @param {Event} event parameter passed from AutoComplete comp.
   */
  handleItemReset = (event) => {
    console.log("event.target.value: " + event.target.value);
    if (event.target.value === "") {
      this.setState({ customerId: null });
    }
  };

  /** Callback function executed from child component <AutoComplete>.
   * @param {Stringt} itemDescription customer selected in the AutoComplete textbox
   */
  handleItemChange = (itemDescription) => {
    console.log("handleItemChange: " + itemDescription);
    let selectedItem = this.state.allItemsList.filter((customer) => {
      return customer.customerName === itemDescription; //event.currentTarget.innerText
    });
    console.log("selectedItem: " + JSON.stringify(selectedItem[0].shortName));
    this.setState({
      customerId: selectedItem[0].customerId,
      custShortName: selectedItem[0].shortName,
    });
  };

  /**
   * Gets the Goods In-Transit Warehouse for a given WH Code
   * @param {*} warehouseCode
   * @returns
   */
  getGITWarehouseCode = (warehouseCode) => {
    const { warehouseList } = this.state;
    if (Array.isArray(warehouseList) && warehouseList.length) {
      const matchingWH = warehouseList.find((warehouse) => warehouse.WhsCode === warehouseCode);
      if (matchingWH && matchingWH.GitWHCode) {
        return matchingWH.GitWHCode;
      }
    }
    // Return the WH code if no GIT WH is present
    return warehouseCode;
  };

  /**
   * Returns Warehouse Name for the given Code
   * @param {String} warehouseCode
   */
  getWarehouseName = (warehouseCode) => {
    const { warehouseList } = this.state;
    let warehouseName = warehouseCode ? warehouseCode : "NA";
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
   * Sets the selected Warehouse or Bin Location to the current Item in the 'state'
   * @param {Number} key   Index of the current Item in the itemsListForTransfer array in the 'state'
   * @param {String} code  Code of the selected Warehouse/Bin
   * @param {String} type  "WAREHOUSE" or "BIN_LOCATION"
   */
  handleWarehouseBinChange = (key, code, type) => {
    this.setState({ warningMsg: "" });
    const { warehouseList } = this.state;
    let itemsListForTransfer = [...this.state.itemsListForTransfer];

    if (type === "WAREHOUSE") {
      itemsListForTransfer[key].WhsCode = code;
      warehouseList.forEach((warehouse) => {
        //console.log(`warehouse.WhsCode: ${warehouse.WhsCode} | code: ${code} | itemsListForTransfer[key].BinCode: ${itemsListForTransfer[key].BinCode}`);
        if (warehouse.WhsCode === code) {
          itemsListForTransfer[key].BinCode = warehouse.BinCode; //auto-select "Bin" on Warehouse change
          itemsListForTransfer[key].LocationCode = warehouse.LocationCode;
          itemsListForTransfer[key].LocationName = warehouse.LocationName;
        }
      });
    } else if (type === "BIN_LOCATION") {
      // itemsListForTransfer[key].U_FromBinLoc = code;
    }
    this.setState({ itemsListForTransfer });
  };

  /**
   *
   * @param {Number} key
   * @param {String} binCode
   */
  handleBinChange = async (level, binCode, key, isConfirmed = false) => {
    this.setState({ warningMsg: "" });
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    if (level === "ROW" && Array.isArray(itemsListForTransfer) && itemsListForTransfer.length > 0) {
      itemsListForTransfer[key].U_ToBinLocation = binCode;
      this.toggleRowLevelToBinPopOver(key);
      this.setState({ itemsListForTransfer });
    } else if (level === "HEADER") {
      if (!isConfirmed) {
        this.setState({ toBinLocation: binCode, toBinHeaderConfirmationPopOver: true });
      } else {
        //set the To Bin selected at the Header level to all Rows
        itemsListForTransfer.forEach((item) => {
          item.U_ToBinLocation = binCode;
        });
        this.setState({
          itemsListForTransfer,
          toBinLocation: binCode,
        });
        this.togglePopover("toBinHeaderConfirmationPopOver");
      }
    }
  };

  /**
   * Set the selected Warehouse to the current Item and get the Available Qty for the item in the Warehouse
   * @param {Number}  key            Index
   * @param {Object}  selectedItem
   * @param {String}  warehouseCode  Selected Warehouse's Code
   * @param {Boolean} togglePopover  Close the Available Qty Popover after WH change?
   */
  handleRowLevelWarehouseChange = async (
    key,
    selectedItem,
    warehouseCode,
    togglePopover = false,
  ) => {
    this.setState({ warningMsg: "" });
    let availableQuantity = "",
      availableQuantityInBins = [];
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    itemsListForTransfer[key].U_FromWarehouse = warehouseCode;
    itemsListForTransfer[key].fromWarehouseLocation = this.getFromWarehouseLocation(warehouseCode);

    //Close the 'Available Qty' popover if the WH change is initiated from the popover
    if (togglePopover) {
      this.toggleAvailableQuantityPopOver("WAREHOUSE", key);
    }

    if (warehouseCode) {
      //Get Available Quantity of the current Item in the selected Warehouse

      /** Getting teh Availble Qty from already available 'allWarehouseAvailableQtyList' from the selected Item
      * instead of pulling it from API. So commented this out
      * 
      const response = await api.get("custom/item-qty-in-warehouse",
        {params: { itemCode: itemsListForTransfer[key].ItemCode, warehouseCode }});

      console.log("handleRowLevelWarehouseChange - response: "+ JSON.stringify(response));
      if(Array.isArray(response.data) && response.data.length) {
        availableQuantity = response.data[0].OnHand;
      }*/

      console.log(
        "selectedItem.allWarehouseAvailableQtyList: " +
          JSON.stringify(selectedItem.allWarehouseAvailableQtyList),
      );
      if (
        Array.isArray(selectedItem.allWarehouseAvailableQtyList) &&
        selectedItem.allWarehouseAvailableQtyList.length
      ) {
        for (let i = 0; i < selectedItem.allWarehouseAvailableQtyList.length; i++) {
          if (warehouseCode == selectedItem.allWarehouseAvailableQtyList[i].WhsCode) {
            availableQuantity = selectedItem.allWarehouseAvailableQtyList[i].OnHand;
            break;
          }
        }
      }

      //get the Bin Locations list & the Available Qty in each list
      availableQuantityInBins = await this.getBinsAndItemQtyForWarehouse(
        "BINS_AND_ITEM_QTY",
        warehouseCode,
        selectedItem.ItemCode,
      );
    }
    itemsListForTransfer[key].availableQuantity = availableQuantity;

    itemsListForTransfer[key].availableQuantityInBins = availableQuantityInBins;
    //reset below Bin related values whenever WH is changed
    itemsListForTransfer[key].U_FromBinLoc = "";
    itemsListForTransfer[key].availableQuantityInBin = 0;

    this.setState({ itemsListForTransfer });

    //NOTE: Calling below funct. here throws this err, as the Popover content & btn wouldn't
    //be rendered yet
    //  The target 'toBinPopOverBtn0' could not be identified in the dom

    //open 'Available Qty in Bin' popover when a WH is changed
    // this.toggleAvailableQuantityPopOver("BIN_LOCATION", key);
  };

  /**
   * Set the 'From Warehouse Location' based on the selected Warehouse
   * @param {String} warehouseCode
   *
   * NOTE: First, instead of storing the WH Loc. 'itemsListForTransfer' I added this method under "render"
   * to pull the WH Loc. dynamically for each row. But this made this funct. getting invoked for each
   * "render", so added logic to store WH Loc. for each item along with the From WH Code, once the
   * itemDetails are pulled from the API during CompDidMount. This reduced the no. of times this funct.
   * is called
   */
  getFromWarehouseLocation = (warehouseCode) => {
    const { warehouseList } = this.state;

    // if(level === "HEADER") {
    let fromWarehouseLocation = "";
    //Set the selected WH's LocationName to 'state'
    for (let i = 0; i < warehouseList.length; i++) {
      if (warehouseList[i].WhsCode === warehouseCode) {
        fromWarehouseLocation = warehouseList[i].LocationName;
        break;
      }
    }
    return fromWarehouseLocation;
    // }
  };

  /**
   * Sets the selected Warehouse Code to state var.
   * @param {String} stateVariable  fromWarehouse or toWarehouse
   * @param {String} warehouseCode       selected Warehouse Code
   * @param {Boolean} isConfirmed   bool. to check if user has confirmed that changing Warehouse will affect all
   *                                the Row level items' From Warehouses too
   */
  handleWarehouseChange = async (stateVariable, warehouseCode, isConfirmed = false) => {
    // let invalidInput = {...this.state.invalidInput};
    // invalidInput[stateVariable] = "";
    let itemsListForTransfer = [...this.state.itemsListForTransfer];

    if (
      warehouseCode &&
      ((stateVariable === "fromWarehouse" && this.state.toWarehouse === warehouseCode) ||
        (stateVariable === "toWarehouse" && this.state.fromWarehouse === warehouseCode))
    ) {
      let invalidInput = { ...this.state.invalidInput };
      invalidInput.toWarehouse = "is-invalid";
      this.setState({
        warningMsg: "Requester Warehouse can't be same as From Warehouse",
        invalidInput,
      });
    }

    //Update FromWarehouse for ALL the 'Rows' when 'Header' level FromWH is changed
    else if (
      stateVariable === "fromWarehouse" &&
      Array.isArray(itemsListForTransfer) &&
      itemsListForTransfer.length
    ) {
      const fromWarehouseLocation = this.getFromWarehouseLocation(warehouseCode);
      this.setState({ fromWarehouseLocation });

      //Check if the user has confirmed that changing the From Warehouse will affect all the
      //Row level items' From Warehouses too. If not confirmed show the popover
      if (!isConfirmed) {
        this.setState({ [stateVariable]: warehouseCode, fromWarehousePopover: true });
      } else {
        this.setState({ isLoading: true, fromWarehousePopover: false });

        if (warehouseCode) {
          //set the selected WH & its Available Quantity & 'Available Qty in Bin' for all rows
          itemsListForTransfer.forEach(async (item) => {
            item.U_FromWarehouse = warehouseCode;
            item.fromWarehouseLocation = this.getFromWarehouseLocation(warehouseCode);
            //reset below Bin related values whenever From WH is changed
            item.U_FromBinLoc = "";
            item.availableQuantityInBin = 0;
            if (
              Array.isArray(item.allWarehouseAvailableQtyList) &&
              item.allWarehouseAvailableQtyList.length
            ) {
              for (let i = 0; i < item.allWarehouseAvailableQtyList.length; i++) {
                if (warehouseCode == item.allWarehouseAvailableQtyList[i].WhsCode) {
                  item.availableQuantity = item.allWarehouseAvailableQtyList[i].OnHand;
                  break;
                }
              }
            }

            //get the Bin Locations list & the Available Qty in each list
            const availableQuantityInBins = await this.getBinsAndItemQtyForWarehouse(
              "BINS_AND_ITEM_QTY",
              warehouseCode,
              item.ItemCode,
            );
            item.availableQuantityInBins = availableQuantityInBins;
          });
        }
        //if the selected WH Code is blank- reset all the Row level WHs & Available Qtys
        else {
          itemsListForTransfer.forEach((item) => {
            item.U_FromWarehouse = ""; //warehouseCode;
            item.FromWarehouse = "";
            item.fromWarehouseLocation = "";
            item.availableQuantity = "";
            //reset below Bin related values whenever WH is changed
            item.U_FromBinLoc = "";
            item.availableQuantityInBin = 0;
            item.availableQuantityInBins = [];
          });
        }
        this.setState({
          isLoading: false,
          [stateVariable]: warehouseCode,
          itemsListForTransfer,
          invalidInput: {},
          warningMsg: "",
        });
      }
    } else if (stateVariable === "toWarehouse") {
      let toBinLocationList = [];
      if (warehouseCode) {
        toBinLocationList = await this.getBinsAndItemQtyForWarehouse("BINS", warehouseCode);
      }

      if (Array.isArray(itemsListForTransfer) && itemsListForTransfer.length) {
        //Reset ALL Row level 'To Bin locs.' when a To Warehouse is chagned
        itemsListForTransfer.forEach((item) => {
          item.U_ToBinLocation = "";
        });
      }

      this.setState({
        toBinLocationList,
        [stateVariable]: warehouseCode,
        invalidInput: {},
        warningMsg: "",
      });
    }
  };

  /**
   * Get the list of Bins & the Available Qty in each Bin for the passed Item & Warehouse
   * @param {String} itemCode
   * @param {String} warehouseCode
   */
  getBinsAndItemQtyForWarehouse = async (type, warehouseCode, itemCode) => {
    this.setState({ isLoading: true });
    let result = [],
      params;
    let uri = "custom/bin-location";
    if (type === "BINS_AND_ITEM_QTY") {
      uri = `${uri}/available-item-qty`;
      params = { itemCode, warehouseCode };
    } else if (type === "BINS") {
      params = { warehouseCode };
    }
    try {
      const response = await api.get(uri, { params });
      console.log(`BinLocation + Avail. Qty List: ${JSON.stringify(response.data)}`);
      if (Array.isArray(response.data) && response.data.length) {
        result = response.data;
      }
    } catch (error) {
      this.setState({ warningMsg: error.response.message });
    } finally {
      this.setState({ isLoading: false });
      return result;
    }
  };

  /**
   * TODO: Need to move this method to helper.js and use it from other comps. too
   * (eg: to load Warehouse list in GRPODraft/ItemDetails.js)
   * Gets the list of Item Code & Desc from Item Master table and load the ITem dropdown list
   * @param {String} type "item"
   */
  loadDropdownList = async (type, value) => {
    this.setState({ isLoading: true });
    const { userSessionLog } = this.context;
    let stateVariable = "",
      response;
    /*if (type === "item") {
      stateVariable = "allItemsList";
    }
    else */
    if (type === "WAREHOUSE") {
      stateVariable = "warehouseList";
    } else if (type === "FROM_WAREHOUSE") {
      stateVariable = "fromWarehouseList";
    } else if (type === "BIN_LOCATION") {
      stateVariable = "binLocationList";
    }
    try {
      response = [];
      if (type === "WAREHOUSE") {
        response = await api.get("custom/warehouse", {
          params: { locationCode: userSessionLog.locationCode },
        });
      }
      // Display ALL WHs in the From WH dropdown
      else if (type === "FROM_WAREHOUSE") {
        response = await api.get("custom/warehouse");
      } else {
        response = await api.get("custom/" + type.toLowerCase(), { params: { branchId: value } });
      }

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
    // const requestDocEntry = this.props.selectedStockTransReq.DocEntry;
    const requestDocEntry = this.props.selectedStockTransReq.ActualDocEntry
      ? this.props.selectedStockTransReq.ActualDocEntry
      : this.props.selectedStockTransReq.DocEntry;

    const fromWarehouse = this.props.selectedStockTransReq.FromWarehouse
      ? this.props.selectedStockTransReq.FromWarehouse
      : this.props.selectedStockTransReq.U_FromWarehouse;

    // this.getFromWarehouseLocation("HEADER", fromWarehouse);
    const fromWarehouseLocation = this.getFromWarehouseLocation(fromWarehouse);
    this.setState({ fromWarehouseLocation });

    if (["Edit", "View"].includes(this.props.operation)) {
      console.log(`StockTransferRequestDetails- operation: ${this.props.operation}`);
      console.log(
        `StockTransferRequestDetails- selectedStockTransReq.itemList: ${JSON.stringify(this.props.selectedStockTransReq.itemList)}`,
      );
      this.setState({
        selectedStockTransReq: this.props.selectedStockTransReq,
        requestDocEntry,

        //had to remove this line here & add it to the 'constructor' for the 'status' to set properly for AUTO_APPROVED recs.
        // requestStatus: this.props.selectedStockTransReq.U_DraftStatus,
        fromWarehouse,
        fromBinLocation: this.props.selectedStockTransReq.U_FromBinLoc,
        toWarehouse: this.props.selectedStockTransReq.ToWhsCode,
        toBinLocation: this.props.selectedStockTransReq.U_ToBinLocation,
        rejectReason:
          this.props.selectedStockTransReq.U_DraftStatus === draftStatus.REJECTED &&
          !this.props.selectedStockTransReq.U_RejectedReason
            ? "NA"
            : this.props.selectedStockTransReq.U_RejectedReason,
        docDate: this.props.selectedStockTransReq.DocDate,
        comments: this.props.selectedStockTransReq.Comments,
        originatorId: this.props.selectedStockTransReq.U_OriginatorId,
        multiLevelApproval: this.props.selectedStockTransReq.U_MultiLevelApproval,
        approvalStatusId: this.props.selectedStockTransReq.U_ApprovalStatusId,
        approvalLevel: this.props.selectedStockTransReq.U_ApprovalLevel,
        branch: isMultiBranchEnabled ? this.props.selectedStockTransReq.BPLName : 1,
        salesEmployee: this.props.selectedStockTransReq.SalesPersonCode,

        //getting 'Rows' via a diff. api call (from getItemsList()) instead of getting from below prop.
        // itemsListForTransfer: this.props.selectedStockTransReq.itemList
      });
      await this.getItemsList(requestDocEntry);
    } else if (this.props.operation === "Create") {
      console.log(`StockTransferRequestDetails- operation: ${this.props.operation}`);
      this.setState({
        selectedStockTransReq: "",
        internalKey: "",
        requestDocEntry: "",
        requestStatus: "",
      });
    }
    //this.toggleModal("rejectReasonPopup");
    //this.props.setGRPODraftDetails("View", {}, 3, this.props.userRole);
  };

  /**
   * Validates the entered data before sending them API
   */
  handleSave = async (event, status) => {
    event.preventDefault();
    const { userSessionLog } = this.context;
    this.setState({ warningMsg: "", invalidInput: {} });
    let request,
      warningMsg = "",
      documentLines = [];
    const { itemsListForTransfer } = this.state;

    //shallow copy the value from state. As this is not an array, slice() cant be used
    let invalidInput = { ...this.state.invalidInput };
    // console.log("this.state.itemsListForTransfer: "+ JSON.stringify(itemsListForTransfer))
    // console.log("this.state.operation: "+ this.state.operation);

    //null is displayed as "blank" in UI, so just checking for "" doesnt work
    if (this.state.operation === "Create") {
      if (!this.state.branch) {
        invalidInput.branch = "is-invalid";
        warningMsg = "Select a Branch";
      } else if (!this.state.fromWarehouse) {
        invalidInput.fromWarehouse = "is-invalid";
        warningMsg = "Select From Warehouse";
      } else if (["", "null", null].includes(this.state.toWarehouse)) {
        invalidInput.toWarehouse = "is-invalid";
        warningMsg = "Select Requester Warehouse";
      } else if (!this.state.toBinLocation) {
        invalidInput.toBinLocation = "is-invalid";
        warningMsg = "Select Requester Bin Location";
      } else if (["", "null", null].includes(this.state.comments)) {
        invalidInput.comments = "is-invalid";
        warningMsg = "Enter remarks";
      } else if (
        status === draftStatus.REJECTED &&
        ["", "null", null].includes(this.state.rejectReason)
      ) {
        this.setState({ popupWarningMsg: "Please enter a reason and submit!" });
      } else if (Array.isArray(itemsListForTransfer) && itemsListForTransfer.length > 0) {
        for (let i = 0; i < itemsListForTransfer.length; i++) {
          if (!itemsListForTransfer[i].Quantity || itemsListForTransfer[i].Quantity == 0) {
            warningMsg = `Add a valid Quantity for item ${itemsListForTransfer[i].ItemCode}`;
            break;
          }
          if (
            parseFloat(itemsListForTransfer[i].Quantity) >
            parseFloat(itemsListForTransfer[i].availableQuantity)
          ) {
            if (
              window.confirm(
                `Item ${itemsListForTransfer[i].ItemCode}'s Entered Quantity is greater than Available Quantity! Are you sure you want to Continue?`,
              )
            ) {
            } else {
              warningMsg = `Item ${itemsListForTransfer[i].ItemCode}'s Entered Quantity is greater than Available Quantity! Please enter a lesser quantity or select a different From Bin Location`;
              break;
            }
          }
          if (!itemsListForTransfer[i].U_FromWarehouse) {
            //FromWarehouse
            warningMsg = `Select a From Warehouse for item ${itemsListForTransfer[i].ItemCode}`;
            break;
          } else if (itemsListForTransfer[i].U_FromWarehouse === this.state.toWarehouse) {
            //FromWarehouse
            warningMsg = `Item ${itemsListForTransfer[i].ItemCode}'s From Warehouse is same as Requester Warehouse! Please select a different one.`;
            break;
          } else if (!itemsListForTransfer[i].U_FromBinLoc) {
            warningMsg = `Select a From Bin Location for item ${itemsListForTransfer[i].ItemCode}`;
            break;
          } else if (!itemsListForTransfer[i].U_ToBinLocation) {
            warningMsg = `Select a Requester Bin Location for item ${itemsListForTransfer[i].ItemCode}`;
            break;
          }
          //when the Row level 'From WH Loc.' doesn't match the Header Level 'From WH Loc.'
          else if (
            itemsListForTransfer[i].fromWarehouseLocation != this.state.fromWarehouseLocation
          ) {
            warningMsg = `Item ${itemsListForTransfer[i].ItemCode}'s From Warehouse Location doesn't match the Header level From Warehouse Location! Please update.`;
            break;
          }
        }
      } else {
        warningMsg = "Add items to proceed";
      }
    }

    if (warningMsg) {
      this.setState({ warningMsg, invalidInput });
    } else {
      this.setState({ isLoading: true, warningMsg: "", invalidInput: {} });
      if (
        Array.isArray(this.state.itemsListForTransfer) &&
        this.state.itemsListForTransfer.length
      ) {
        /** NOTE: Below code (to delete few properties b4 adding the items to the payload) mutates the
         * 'itemsListForTransfer' in the state, so ItemName, UOM, FromWarehouse columsn disapper after the req.
         * is submitted. Neither slice() nor [...] worked. So I'm creating a new array instead of cloning the
         * state var. 'itemsListForTransfer' */
        /*
        //itemsListForTransfer = [...this.state.itemsListForTransfer]; //state var. is mutated
        itemsListForTransfer = this.state.itemsListForTransfer.slice(); //still mutated
        //remove ItemName & add WarehouseCode to each item
        itemsListForTransfer.forEach(item => {
          delete item.ItemName;
          delete item.InvntryUom; //deleting to fix - Property 'InvntryUom' of 'StockTransfer' is invalid error
          item.WarehouseCode = this.state.toWarehouse;
          //  NOTE: U_FromWarehouse is used to save the FromWarehouse code for Drafts, bcoz there is no place
          //   in Draft table to store this info, but Stock Trans. Req. has this field 'FromWarehouse' to store that
          //   data. So when creating a Draft, 'U_FromWarehouse' is used. When a Draft is approved, I copy this
          //   value to 'FromWarehouse' & send it to service layer api

          item.U_FromWarehouse = item.U_FromWarehouse;
          delete item.U_FromWarehouse //this prop was causing below err when an Admin adds a STR direclty
          //Property 'FromWarehouse' of 'StockTransferLine' is invalid
          //STR API fails if an unnecessary property is present in teh payload
        });
        */
        this.state.itemsListForTransfer.forEach((item) => {
          documentLines.push({
            ItemCode: item.ItemCode,
            Quantity: item.Quantity,
            WarehouseCode: this.getGITWarehouseCode(this.state.toWarehouse), //To Warehouse is common for all Items
            FromWarehouseCode: item.U_FromWarehouse,
            U_FromWarehouse: item.U_FromWarehouse,
            U_FromBinLoc: item.U_FromBinLoc,
            U_ToBinLocation: item.U_ToBinLocation,
            MeasureUnit: item.InvntryUom, //added to fix Incorrect UoM issue, ERROR:[StockTransferLines.MeasureUnit] "Field cannot be updated"
          });
        });
      }

      if (status == draftStatus.REJECTED) this.closePopup();

      let comments = this.state.comments;
      //Add the default prefix when it's not already prepended
      if (comments && comments.indexOf(requestComment) === -1) {
        comments = userSessionLog.storeLocation + " - " + requestComment + comments;
      }

      request = {
        userId: localStorage.getItem("InternalKey"),
        FromWarehouse: this.state.fromWarehouse,
        // U_FromWarehouse: this.state.fromWarehouse,
        U_FromBinLoc: this.state.fromBinLocation,
        ToWarehouse: this.getGITWarehouseCode(this.state.toWarehouse),
        U_ToBinLocation: this.state.toBinLocation,
        Comments: comments,
        // DocumentLines: documentLines
        StockTransferLines: documentLines,
        SalesPersonCode: this.state.salesEmployee,
        U_Location: userSessionLog.storeLocation,
      };
      if (this.state.branch) {
        request.branchId = this.state.branch;
      }

      console.log("*** Stock trans request: " + JSON.stringify(request));

      try {
        let response;
        if (this.state.operation === "Create") {
          response = await api.post("/service/stock-transfer-request", request);
          if (response.data) {
            console.log("Stock Trans. Req. Response: " + JSON.stringify(response.data.response));
            if (response.data.draftNum) {
              this.setState({
                requestDocEntry: response.data.draftNum,
                successMsg: `Request #${response.data.draftNum} has been created and sent to ${response.data.approverName} for approval`,
                operation: "View", //to hide Submit button
              });
            } else if (response.data.stockTransferRequestNum) {
              this.setState({
                requestDocEntry: response.data.stockTransferRequestNum,
                successMsg: `Stock Transfer Request #${response.data.stockTransferRequestNum} has been created`,
                operation: "View", //to hide Submit button
              });
            }
          } else {
            this.setState({ warningMsg: "Something went wrong. Please try again after sometime" });
          }
        } else if (this.state.operation === "Edit") {
          request.userId = localStorage.getItem("InternalKey");
          request.DocEntry = this.state.requestDocEntry;
          request.U_DraftStatus = status;
          request.U_RejectedReason = this.state.rejectReason;
          request.U_OriginatorId = this.state.originatorId;
          request.U_MultiLevelApproval = this.state.multiLevelApproval;
          request.U_ApprovalStatusId = this.state.approvalStatusId;
          request.U_ApprovalLevel = this.state.approvalLevel;

          response = await api.patch("/service/stock-transfer-request", request);
          const strDraftStatus = response.data.draftStatus;
          const noOfDays = parseInt(response.data.noOfDays);
          console.log("*** APPROVED response: " + JSON.stringify(response));

          if (response.data.stockResponse)
            console.log(
              "*** APPROVED stockResponse: " + JSON.stringify(response.data.stockResponse),
            );

          if (strDraftStatus) {
            let successMsg;
            if ([draftStatus.APPROVED, draftStatus.PENDING].includes(strDraftStatus)) {
              successMsg = "Request has been Approved!";

              //if the Draft has been approved within 3 days of Creation is prev. Approval date
              //display Confetti
              if (noOfDays > -1 && noOfDays <= 3) {
                realistic();
              }
            } else if (strDraftStatus === draftStatus.REJECTED)
              successMsg = "Request has been rejected!";

            this.setState({
              //successMsg: response.data.message,
              requestStatus: strDraftStatus,
              successMsg,
              operation: "View", //to hide Submit button
            });
            //await this.getGRPODraftList();
          }
        }
      } catch (error) {
        this.setState({
          warningMsg: error.response ? error.response.data.message : "Network error!",
          //operation: "NA" //to hide Submit button
        });
      } finally {
        this.setState({ isLoading: false });
      }

      /*this.setState({
        warningMsg: "",
        selectedStockTransReq: {},
        internalKey: "",
        requestDocEntry: "",
        originatorId: "",
        docDate: "",
        comments: "",
        invalidInput: {},
        isLoading: false
      });*/

      /** Set "state" variables in the Parent Component when the popup is closed, this is sent back to <GRPODraftList>
       * where GRPODraft list will be updated based on the "operation"
       */
      //this.props.setGRPODraftDetails("Saved", {});
    }
  };

  /**
   * Gets Available Qty info for each Item from all 'portal' WHs & set the details to
   * 'itemsListForTransfer'
   */
  getAvailableQtyForAllItems = async (itemsListForTransfer) => {
    this.setState({ isLoading: true });
    let itemCodesInPO = [];
    // let itemsListForTransfer = cloneDeep(this.state.itemsListForTransfer);

    if (Array.isArray(itemsListForTransfer) && itemsListForTransfer.length) {
      itemsListForTransfer.forEach((item) => {
        if (!itemCodesInPO.includes(item.ItemCode)) {
          itemCodesInPO.push(item.ItemCode);
        }
      });
    }

    try {
      const allWHItemQtyresponse = await api.get("custom/item-qty-in-warehouse", {
        params: { itemCode: itemCodesInPO },
      });
      console.log("allWHItemQtyresponse: " + JSON.stringify(allWHItemQtyresponse));

      //Add Available Qty info for each Item from all 'portal' WH to 'itemsListForTransfer'
      if (Array.isArray(allWHItemQtyresponse.data) && allWHItemQtyresponse.data.length) {
        let allWarehouseAvailableQtyList = [];
        itemsListForTransfer.forEach((item) => {
          allWHItemQtyresponse.data.forEach((qtyRec) => {
            if (item.ItemCode === qtyRec.ItemCode) {
              allWarehouseAvailableQtyList.push(qtyRec);
            }
          });
          item.allWarehouseAvailableQtyList = allWarehouseAvailableQtyList;
          allWarehouseAvailableQtyList = [];
        });

        this.setState({ itemsListForTransfer, isLoading: false });
      }
    } catch (err) {
      this.setState({
        isLoading: false,
        warningMsg:
          err.data && err.data.message
            ? err.data.message
            : "Unable to get Item details! Please try again.",
      });
    }
  };

  /**
   * Set the selected Production Order details from "props" to "state" and open the pop-up window
   */
  setProdOrderValuesToState = () => {
    console.log(
      "this.props.selectedProductionOrder: " + JSON.stringify(this.props.selectedProductionOrder),
    );
    if (this.props.operation === "Create" && this.props.selectedProductionOrder) {
      const requestDocEntry = this.props.selectedProductionOrder.DocEntry;
      console.log(`StockTransferRequestDetails- operation: ${this.props.operation}`);
      console.log(
        `StockTransferRequestDetails- selectedProductionOrder.itemList: ${JSON.stringify(this.props.selectedProductionOrder.itemList)}`,
      );
      this.setState({
        selectedProductionOrder: this.props.selectedProductionOrder,
        requestDocEntry,
        poNum: this.props.selectedProductionOrder.DocNum,
        productName: this.props.selectedProductionOrder.ProdName,
        plannedQty: this.props.selectedProductionOrder.PlannedQty
          ? parseFloat(this.props.selectedProductionOrder.PlannedQty).toFixed(3)
          : 0.0,
        completedQty: this.props.selectedProductionOrder.CmpltQty
          ? parseFloat(this.props.selectedProductionOrder.CmpltQty).toFixed(3)
          : 0.0,
        docDate: this.props.selectedProductionOrder.PostDate,
        toWarehouse: this.props.selectedProductionOrder.Warehouse, //Product's WH is set as the 'To Warehouse'
        comments: "Based on Production Order " + this.props.selectedProductionOrder.DocNum,
      });
      //await this.getItemsList(requestDocEntry);
    }
  };

  async componentDidUpdate(prevProps, prevState) {
    // Set Store WH as default Requester WH
    const { storeWHCode, userSessionLog } = this.context;
    console.log("storeWHCode: ", storeWHCode);
    console.log("prevState.toWarehouse: ", prevState.toWarehouse);
    console.log("this.state.toWarehouse: ", this.state.toWarehouse);
    if (!prevState.toWarehouse && !this.state.toWarehouse && !this.state.isDefaultToWarehouseSet) {
      this.setState({ isDefaultToWarehouseSet: true });
      this.handleWarehouseChange("toWarehouse", storeWHCode);
    }

    // Set user's Sales Employee as default Sales Employee
    if (
      !prevState.salesEmployee &&
      !this.state.salesEmployee &&
      !this.state.isDefaultSalesEmployeeSet
    ) {
      this.setState({
        salesEmployee: userSessionLog.userSalesEmployeeCode,
        isDefaultSalesEmployeeSet: true,
      });
    }

    //console.log("prevProp: "+ JSON.stringify(prevProps.operation))
    console.log("componentDidUpdate operation: " + this.state.operation);
    //console.log("prevState: "+ JSON.stringify(prevState.selectedStockTransReq))
    if (this.props.selectedStockTransReq && !prevProps.selectedStockTransReq) {
      //await this.getItemsList();
      await this.openTab();
    }
    //If the user is navigated from PO screen
    else if (this.props.selectedProductionOrder && !prevProps.selectedProductionOrder) {
      this.setProdOrderValuesToState();
      console.log(
        "STR selectedProductionOrder: " + JSON.stringify(this.props.selectedProductionOrder),
      );
      await this.getItemsList(this.props.selectedProductionOrder.DocEntry);
    }
    /*
    this results in "Maximum update depth exceeded" error, so commented it out
    if(this.state.operation === "Create") {
      this.setState({
        itemsListForTransfer: [{
          LineNum: 0,
          ItemCode: "",
          Quantity: "",
          //UOM: ""
        }]
      });
    } */
    // if(this.state.operation != "Create") { //added this IF block by mistake
    /*if(!Array.isArray(this.state.allItemsList) || !this.state.allItemsList.length) {
        await this.loadDropdownList("item");
      }*/
    // }
    console.log(
      "StockTransferRequestDetails - componentDidUpdate - this.props.userRole: " +
        this.props.userRole,
    );
  }

  /**
   * Update the 'selected' prop for filteredItemsList & allItemsList and add teh selected item to
   * 'itemsListForTransfer'
   *
   * @param {Number}  index         Position of the selected/unselected Item
   * @param {Object}  selectedItem  Current Item obj.
   * @param {Boolean} isSelected    if the Item is selected or unselected
   */
  /*
   Replaced this with below funct. to pass it to <VirtualizedItemsList> comp.
  handleItemCheckboxChange = async (index, selectedItem, isSelected) => {
    this.setState({ isLoading: true });
    let allItemsList = this.state.allItemsList.slice();
    let filteredItemsList = this.state.filteredItemsList.slice();
    let newItem = {};
    let itemsListForTransfer = [];
    
    if(Array.isArray(this.state.itemsListForTransfer) && this.state.itemsListForTransfer.length)
      itemsListForTransfer = this.state.itemsListForTransfer.slice();

    //filteredItemsList[index].selected = isSelected;
    if(isSelected) {
      filteredItemsList[index].selected = true;
      //clone the selectedItem. This works but cloning this way adds the 'selected' prop to itemsListForTransfer 
      //array too which is not required
      //itemsListForTransfer.push({ ...selectedItem, Quantity: 1 });
      newItem = {
        ItemCode: selectedItem.ItemCode,
        ItemName: selectedItem.ItemName,
        Quantity: 1,
        InvntryUom: selectedItem.InvntryUom,
        //FromWarehouse: this.state.fromWarehouse //TODO: Need to set availableQuantity for this row as well
      }
      try {
        const allWHItemQtyresponse = await api.get("custom/item-qty-in-warehouse",
          {params: { itemCode: selectedItem.ItemCode }});
        console.log("allWHItemQtyresponse: "+ JSON.stringify(allWHItemQtyresponse));
        
        if(Array.isArray(allWHItemQtyresponse.data) && allWHItemQtyresponse.data.length) {
          newItem.allWarehouseAvailableQtyList = allWHItemQtyresponse.data;
        }
        itemsListForTransfer.push(newItem);
      }
      catch(err) {
        this.setState({ warningMsg: (err.data && err.data.message) ? err.data.message : "Unable to get Item details! Please try again."})
      }
    }
    else {
      let position;
      filteredItemsList[index].selected = false;
      if(itemsListForTransfer.length) {
        for(let i=0; i < itemsListForTransfer.length; i++) {
          //get the position of the unselected item in the 'itemsListForTransfer' array to remove it
          if(itemsListForTransfer[i].ItemCode == selectedItem.ItemCode) {
            position = i;
            break;
          }
        }
        itemsListForTransfer.splice(position, 1);
      }
    }

    //set the 'selected' prop for the 'allItemsList' as well
    allItemsList.forEach(item => {
      if(item.ItemCode === selectedItem.ItemCode) {
        item.selected = isSelected;
      }
    })

    this.setState({ allItemsList, filteredItemsList, itemsListForTransfer, isLoading: false });
  } */

  /**
   * Called from <VirtualizedItemsList>. Adds the selected item to 'itemsListForTransfer'
   *
   * @param {Object}  selectedItem  Current Item obj.
   */
  handleItemSelection = async (selectedItem, isSelected) => {
    this.setState({
      isLoading: true,
      // virtualTableWarningMsg: ""
    });
    let newItem = {};
    let itemsListForTransfer = [];

    if (Array.isArray(this.state.itemsListForTransfer) && this.state.itemsListForTransfer.length)
      itemsListForTransfer = this.state.itemsListForTransfer.slice();

    /*
    Commenting this out, as I have replaced "checkbox" with "Plus" icon in the <VirtualizedItemList>
    let position = -1;
    if(itemsListForTransfer.length) {
      for(let i=0; i < itemsListForTransfer.length; i++) {
        //get the position of the selected/unselected item in the 'itemsListForTransfer' array.
        //this will be used to check if the Item already exist b4 adding it to 'itemsListForTransfer'
        //& to remove it when teh checkbox is unselcted in teh <Virt..> comp.
        if(itemsListForTransfer[i].ItemCode == selectedItem.ItemCode) {
          position = i;
          break;
        }
      }
    }*/

    /*if(isSelected) {
      //If the Item is already added
      if(position > -1) {
        this.setState({ virtualTableWarningMsg: "The selected item has already been added. Please select a different item." })
      }
      else { */
    //clone the selectedItem. This works but cloning this way adds the 'selected' prop to itemsListForTransfer
    //array too which is not required
    //itemsListForTransfer.push({ ...selectedItem, Quantity: 1 });
    newItem = {
      ItemCode: selectedItem.ItemCode,
      ItemName: selectedItem.ItemName,
      Quantity: 1,
      InvntryUom: selectedItem.InvntryUom,
      //FromWarehouse: this.state.fromWarehouse //TODO: Need to set availableQuantity for this row as well
    };
    try {
      const allWHItemQtyresponse = await api.get("custom/item-qty-in-warehouse", {
        params: { itemCode: selectedItem.ItemCode },
      });
      console.log("allWHItemQtyresponse: " + JSON.stringify(allWHItemQtyresponse));

      if (Array.isArray(allWHItemQtyresponse.data) && allWHItemQtyresponse.data.length) {
        newItem.allWarehouseAvailableQtyList = allWHItemQtyresponse.data;
      }
      itemsListForTransfer.push(newItem);
    } catch (err) {
      this.setState({
        warningMsg:
          err.data && err.data.message
            ? err.data.message
            : "Unable to get Item details! Please try again.",
      });
    }
    /*}
    }
    else {
      //if the item has already been added remove it from the 'itemsListForTransfer'
      if(position) {
        itemsListForTransfer.splice(position, 1);
      }
    }*/

    this.setState({ itemsListForTransfer, isLoading: false });
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    console.log("StockTransferRequestDetails - componentDidMount");
    this._isMounted = true;

    if (!Array.isArray(this.state.warehouseList) || !this.state.warehouseList.length) {
      await this.loadDropdownList("WAREHOUSE");
    }

    if (!Array.isArray(this.state.fromWarehouseList) || !this.state.fromWarehouseList.length) {
      await this.loadDropdownList("FROM_WAREHOUSE");
    }

    if (this.props.selectedStockTransReq) {
      //await this.getItemsList();
      await this.openTab();
    } else if (this.props.selectedProductionOrder) {
      this.setProdOrderValuesToState();
      await this.getItemsList(this.props.selectedProductionOrder.DocEntry);
    }
    console.log(
      "StockTransferRequestDetails - componentDidMount - this.props.userRole: " +
        this.props.userRole,
    );
    console.log(
      "StockTransferRequestDetails - componentDidMount - this.props.operation: " +
        this.props.operation,
    );

    if (this.state.operation === "Create") {
      //the below two List are required only durin "Create" op.
      if (!Array.isArray(this.state.filteredItemsList) || !this.state.filteredItemsList.length) {
        //moved the item loading fucntionality to <VirtualizedItemList> comp.
        // await this.loadDropdownList("item");
      }

      /*this.setState({
        itemsListForTransfer: [{
          LineNum: 0,
          ItemCode: "",
          //ItemName: "",
          Quantity: "",
          //UOM: ""
        }]
      });*/
    }
  }

  render() {
    const { userSessionLog } = this.context;
    console.log("filteredItemsList: " + JSON.stringify(this.state.filteredItemsList));
    const { operation, filteredItemsList } = this.state;
    let itemsTableHead = [
      "#",
      "Item Number",
      "Item Description",
      "From Warehouse",
      "From Warehouse Loc.",
      "From Bin Loc.",
      "Req. Bin Loc.",
      "Quantity",
      "UOM",
    ]; // "Bin Loc.",

    if (operation === "Create") {
      itemsTableHead.splice(0, 0, "Del./Copy"); //Show Delete/Copy buttons
      itemsTableHead.splice(6, 0, "WH Available Qty"); //show this column only for "Create" op.
      // itemsTableHead.splice(6, 0, "From Bin Loc."); //show this column only for "Create" op.
    }
    const itemsTableHeadForPopup = ["", "Item Number", "Item Description", "UOM"];

    let displayMode = mode.DISABLED;
    if (
      this.props.userRole == userRoles.APPROVER &&
      this.state.requestStatus == draftStatus.PENDING
    ) {
      displayMode = mode.NORMAL;
    }
    console.log("this.state.requestStatus: " + this.state.requestStatus);
    console.log("displayMode: " + displayMode);
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
                      Stock Transfer Request{" "}
                      {this.props.selectedStockTransReq
                        ? "#" + this.props.selectedStockTransReq.DocEntry
                        : ""}
                    </h3>
                  </Col>
                  <Col className="text-right" sm="8">
                    {this.state.isLoading ? (
                      <>
                        {/* <i className="fa fa-info-circle text-blue" /> &nbsp; */}
                        <small className="my-2 text-primary">
                          Processing your request...&emsp;
                        </small>
                        {/* TODO: Need to reduce this size.. */}
                        <Spinner color="primary" className="reload-spinner mr-4" />
                      </>
                    ) : this.state.successMsg ? (
                      <span className="text-success mr-5 small">
                        <i className="fa fa-info-circle" /> &nbsp;
                        {this.state.successMsg}
                      </span>
                    ) : this.state.warningMsg ? (
                      <span className="text-warning mr-5 small">
                        <i className="fa fa-exclamation-triangle" /> &nbsp;
                        {this.state.warningMsg}
                      </span>
                    ) : (
                      displayMode == mode.NORMAL && (
                        <>
                          <Button
                            size="sm"
                            color="primary"
                            type="button"
                            onClick={(e) => this.handleSave(e, draftStatus.APPROVED)}
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
                    {!this.state.isLoading && this.state.operation === "Create" && (
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
                    {/* {this.state.actualDraftStatus === draftStatus.APPROVED &&
                        <Button
                          color="primary"
                          // href="#"
                          size="sm"
                          onClick={() => this.handleViewQRCodes()}
                          className="ml-2"
                        >
                          View QR Codes
                        </Button>
                      } */}
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="mt--2">
                {/* Display the Production Order info if the user is navigated from Production Order screen*/}
                {this.props.selectedProductionOrder && (
                  <>
                    <h6 className="heading-small text-muted mb-3">Production Order Info</h6>
                    <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow-xl">
                      {" "}
                      {/** text-center */}
                      <Row>
                        <Col md="3" sm="6">
                          <small className="text-muted">Production Order#</small>
                          <h4 className="mt-1">{this.state.poNum}</h4>
                        </Col>
                        <Col md="3" sm="6">
                          <small className="text-muted">Product Name</small>
                          <h4 className="mt-1">{this.state.productName}</h4>
                        </Col>
                        <Col md="3" sm="6">
                          <small className="text-muted">Planned Quantity</small>
                          <h4 className="mt-1">{this.state.plannedQty}</h4>
                        </Col>
                        <Col md="3" sm="6">
                          <small className="text-muted">Completed Quantity</small>
                          <h4 className="mt-1">{this.state.completedQty}</h4>
                        </Col>
                      </Row>
                    </Card>
                  </>
                )}
                <h6 className="heading-small text-muted mb-3">Transfer Request Info</h6>
                {/** <div className="pl-lg-3 pr-lg-3 mt--1 mb-2"> */}
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow-xl">
                  {" "}
                  {/** text-center */}
                  <Row>
                    {/* <Col md="4">
                        <small className="text-muted">Requested By</small>
                        <h4 className="mt-1">{localStorage.getItem("UserName")}</h4>
                      </Col> */}
                    <Col md="3">
                      <small className="text-muted">Request Date</small>
                      <h4 className="mt-1">{this.state.requestDate}</h4>
                    </Col>
                    {/* Display the Branch info only when Multiple Branches are configured */}
                    {isMultiBranchEnabled && (
                      <Col md="3">
                        {operation === "Create" ? (
                          <BranchDropdown
                            className={this.state.invalidInput.branch}
                            label="Branch"
                            handleChange={this.handleBranchChange}
                          />
                        ) : (
                          <>
                            <small className="text-muted">Branch</small>
                            <h4 className="mt-1">{this.state.branch}</h4>
                          </>
                        )}
                      </Col>
                    )}
                    <Col md="3">
                      <small className="text-muted">From Warehouse Location</small>
                      <h4 className="mt-1">
                        {this.state.fromWarehouseLocation
                          ? this.state.fromWarehouseLocation
                          : userSessionLog.storeLocation}
                      </h4>
                    </Col>
                    <Col md="3">
                      <small className="text-muted">From Warehouse</small>
                      {operation === "Create" ? (
                        <>
                          <div className="mt-1 mb-3">
                            <Popover
                              placement="top"
                              target={`fromWarehouse`}
                              className="popover-warning"
                              isOpen={this.state.fromWarehousePopover}
                            >
                              <PopoverBody className="text-center">
                                <p className="text-gray-dark text-xs text-center mb-2 font-weight-600">
                                  Selected From Warehouse will be applied to all the below items.
                                  Are you sure you want to continue?
                                </p>
                                <Button
                                  outline
                                  color="primary"
                                  // href="#"
                                  onClick={() =>
                                    this.handleWarehouseChange(
                                      "fromWarehouse",
                                      this.state.fromWarehouse,
                                      true,
                                    )
                                  }
                                  size="sm"
                                >
                                  Yes
                                </Button>
                                <Button
                                  outline
                                  color="danger"
                                  // href="#"
                                  onClick={() => this.togglePopover("fromWarehousePopover")}
                                  size="sm"
                                >
                                  No
                                </Button>
                              </PopoverBody>
                            </Popover>
                            <Input
                              bsSize="sm"
                              id="fromWarehouse"
                              type="select"
                              name="select"
                              className={
                                "form-control display-4 text-gray-dark " +
                                this.state.invalidInput.fromWarehouse
                              }
                              value={this.state.fromWarehouse}
                              //style={{ width: "auto" }} //width: 100
                              onChange={(event) =>
                                this.handleWarehouseChange("fromWarehouse", event.target.value)
                              }
                            >
                              <option value="">-- Select a Warehouse --</option>
                              {this.state.fromWarehouseList.map((warehouse, key) => {
                                return (
                                  <option key={warehouse.WhsCode} value={warehouse.WhsCode}>
                                    {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
                                  </option>
                                );
                              })}
                            </Input>
                          </div>
                        </>
                      ) : (
                        <h4 className="mt-1">{this.getWarehouseName(this.state.fromWarehouse)}</h4>
                      )}
                    </Col>
                    {/* <Col md="3">
                        <small className="text-muted">From Warehouse Location</small>
                        <h4 className="mt-1">{this.state.fromWarehouseLocation ? this.state.fromWarehouseLocation : "NA"}</h4>
                      </Col> */}
                    {/* <Col md="3">
                        <small className="text-muted">From Bin Location</small>
                          {operation === "Create" ? 
                            <div className="mt-1 mb-3">
                              <Popover
                                placement="top"
                                target={`toBinLocation`}
                                className="popover-warning"
                                isOpen={this.state.fromBinHeaderConfirmationPopOver}
                              >
                                <PopoverBody className="text-center">
                                  <p className="text-gray-dark text-xs text-center mb-2 font-weight-600">
                                    Selected Bin Location will be applied to all the below items.
                                    Are you sure you want to continue?
                                  </p> 
                                  <Button
                                    outline
                                    color="primary"
                                    onClick={() => 
                                      this.handleBinChange("HEADER", this.state.tempFromBinLocation, null, true)}
                                    size="sm"
                                  >
                                    Yes
                                  </Button>
                                  <Button
                                    outline
                                    color="danger"
                                    onClick={() => this.togglePopover("fromBinHeaderConfirmationPopOver")}
                                    size="sm"
                                  >
                                    No
                                  </Button>
                                </PopoverBody>
                              </Popover>
                              <Input bsSize="sm"
                                id="toBinLocation"
                                type="select"
                                name="select"
                                className={"form-control display-4 text-gray-dark "
                                  + this.state.invalidInput.fromBinLocation}
                                value={this.state.fromBinLocation}
                                //style={{ width: "auto" }} //width: 100
                                onChange={(e) => this.handleBinChange("HEADER", e.target.value)}
                              >
                                <option value="">-- Select a Bin --</option>
                                {Array.isArray(this.state.fromBinLocationList) && this.state.toBinLocationList.length > 0
                                  && this.state.fromBinLocationList.map((bin, key) => {
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
                            </div>
                          : <h4 className="mt-1">{this.state.fromBinLocation}</h4>
                        }
                      </Col> */}
                    <Col md="3">
                      {/* <Col md={this.state.operation === "Create" ? "3" : "4"}> */}
                      <small className="text-muted">Requester Warehouse</small>
                      {operation === "Create" ? (
                        <div className="mt-1 mb-3">
                          <Input
                            bsSize="sm"
                            type="select"
                            name="select"
                            className={
                              "form-control display-4 text-gray-dark " +
                              this.state.invalidInput.toWarehouse
                            }
                            value={this.state.toWarehouse}
                            //style={{ width: "auto" }} //width: 100
                            onChange={(event) =>
                              this.handleWarehouseChange("toWarehouse", event.target.value)
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
                      ) : (
                        <h4 className="mt-1">{this.getWarehouseName(this.state.toWarehouse)}</h4>
                      )}
                    </Col>
                    <Col md="3">
                      <small className="text-muted">Requester Bin Location</small>
                      {operation === "Create" ? (
                        <div className="mt-1 mb-3">
                          <Popover
                            placement="top"
                            target={`toBinLocation`}
                            className="popover-warning"
                            isOpen={this.state.toBinHeaderConfirmationPopOver}
                          >
                            <PopoverBody className="text-center">
                              <p className="text-gray-dark text-xs text-center mb-2 font-weight-600">
                                Selected Bin Location will be applied to all the below items. Are
                                you sure you want to continue?
                              </p>
                              <Button
                                outline
                                color="primary"
                                onClick={() =>
                                  this.handleBinChange(
                                    "HEADER",
                                    this.state.toBinLocation,
                                    null,
                                    true,
                                  )
                                }
                                size="sm"
                              >
                                Yes
                              </Button>
                              <Button
                                outline
                                color="danger"
                                onClick={() => this.togglePopover("toBinHeaderConfirmationPopOver")}
                                size="sm"
                              >
                                No
                              </Button>
                            </PopoverBody>
                          </Popover>
                          <Input
                            bsSize="sm"
                            id="toBinLocation"
                            type="select"
                            name="select"
                            className={
                              "form-control display-4 text-gray-dark " +
                              this.state.invalidInput.toBinLocation
                            }
                            value={this.state.toBinLocation}
                            //style={{ width: "auto" }} //width: 100
                            onChange={(e) => this.handleBinChange("HEADER", e.target.value)}
                          >
                            <option value="">-- Select a Bin --</option>
                            {Array.isArray(this.state.toBinLocationList) &&
                              this.state.toBinLocationList.length > 0 &&
                              this.state.toBinLocationList.map((bin, key) => {
                                return (
                                  <option key={bin.BinCode} value={bin.BinCode}>
                                    {bin.BinCode}
                                  </option>
                                );
                              })}
                          </Input>
                        </div>
                      ) : (
                        <h4 className="mt-1">{this.state.toBinLocation}</h4>
                      )}
                    </Col>
                    <Col sm="6" md="3">
                      <SalesEmployeeDropdown
                        label={"Sales Employee"}
                        propName={"salesEmployee"}
                        value={this.state.salesEmployee}
                        handleChange={this.handleHeaderFieldChange}
                        disabled={
                          this.state.operation === "Create"
                            ? false
                            : displayMode == mode.DISABLED
                              ? true
                              : false
                        }
                      />
                    </Col>
                    <Col md="5">
                      <small className="text-muted">Remarks</small>
                      <FormGroup className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          rows="1"
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
                            this.state.operation === "Create"
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
                {/** <hr className="my-2" /> */}
                {/* <FormGroup className="mt-1">
                          <Input
                            bsSize="sm"
                            style={{ width: 55 + "%" }}
                            value={draft.DiscountPercent}
                            className={"form-control display-4 text-gray-dark "}
                            id="input-disc-perc"
                            placeholder=""
                            type="number"
                            disabled
                            onChange={(e) => this.handleDiscountPercentChange(e.target.value)}
                          />
                        </FormGroup> */}

                {/* Item Details */}
                <Row className="align-items-center">
                  <Col xs="5">
                    <h6 className="heading-small text-muted mb-4">Item Details</h6>
                  </Col>
                  {/** Show this button when the user is not navigated from PO screen */}
                  {operation === "Create" && !this.props.selectedProductionOrder && (
                    <Col xs="7" className="mb-4 text-right">
                      <Button
                        size="sm"
                        //className="ml-auto" //this will move the 'Save' button to the left side of the modal
                        color="primary"
                        type="button"
                        //onClick={() => this.handleAddItem()}
                        onClick={() => this.toggleModal("itemListPopup")}
                      >
                        Add Item
                      </Button>
                    </Col>
                  )}
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
                        this.state.itemsListForTransfer.length > 0
                          ? this.state.itemsListForTransfer.map((item, key) => {
                              return (
                                <>
                                  <tr key={item.ItemCode} id={"trId" + key}>
                                    {this.state.operation === "Create" && (
                                      <td>
                                        <span
                                          id={"itemRemoval-" + key}
                                          className="btn-inner--icon mt-1 cursor-pointer"
                                          // style={{cursor: "pointer"}}
                                          onClick={() => this.handleRemoveItem(key)}
                                        >
                                          <i className="fa fa-trash text-red" />
                                        </span>
                                        <span
                                          id={"itemRemoval-" + key}
                                          className="btn-inner--icon ml-2 mb-2 pb-1 cursor-pointer"
                                          // style={{cursor: "pointer"}}
                                          onClick={() => this.handleCopyItem(item, key)}
                                        >
                                          <i className="fa fa-copy text-primary"></i>{" "}
                                          {/** fa-clone far fa-copy*/}
                                        </span>
                                      </td>
                                    )}
                                    <td>{key + 1}</td>
                                    {
                                      //this.state.operation === "Create" ?
                                      /* <AutoComplete
                                        suggestions={this.state.filteredItemsList}
                                        className="form-control"
                                        filterKey="ItemName"
                                        suggestionLimit={4}
                                        placeholder="Enter Item Desc."
                                        //reset "clearInput" props when Customer Name is entered
                                        onSuggestionItemClick={this.handleItemChange}
                                        onChange={this.handleItemReset}
                                        clearInput={this.state.clearSelectedItem}
                                        resetClearInput={() => this.resetClearInput(key)}
                                      /> */
                                      /*<Input bsSize="sm" type="select" name="select"
                                        className="mt-2 pt-1 pb-2"
                                        value={item.ItemCode}
                                        //style={{ width: "auto" }} //width: 100
                                        onChange={(event) =>
                                          this.handleFieldChange("ItemCode", event.target.value, key)
                                        }
                                      >
                                        <option key={"NA"} value={""}>
                                          -- Select an Item --
                                        </option>
                                        {this.state.filteredItemsList.map((dropdownItem, key) => {
                                          return (
                                            <option
                                              key={dropdownItem.ItemCode+key}
                                              value={dropdownItem.ItemCode}
                                            >
                                              {dropdownItem.ItemName}
                                            </option>
                                          )
                                        })}
                                      </Input>
                                      : <th scope="row" style={{ whiteSpace: "unset" }}>{item.ItemName}</th>*/
                                    }
                                    <td>{item.ItemCode}</td>
                                    {/* <th scope="row" style={{ whiteSpace: "unset" }}> */}
                                    <th scope="row">{item.ItemName}</th>
                                    <td style={{ whiteSpace: "unset" }}>
                                      {operation === "Create" ? (
                                        <Input
                                          bsSize="sm"
                                          type="select"
                                          name="select"
                                          className={
                                            "form-control " +
                                            this.state.invalidRowFromWarehouse[key]
                                          }
                                          value={
                                            item.U_FromWarehouse
                                              ? item.U_FromWarehouse
                                              : item.FromWarehouse
                                          }
                                          //style={{ width: "auto" }} //width: 100
                                          onChange={(event) =>
                                            this.handleRowLevelWarehouseChange(
                                              key,
                                              item,
                                              event.target.value,
                                            )
                                          }
                                        >
                                          <option value="">-- Select a Warehouse --</option>
                                          {this.state.fromWarehouseList.map((warehouse, key) => {
                                            return (
                                              <option
                                                key={warehouse.WhsCode}
                                                value={warehouse.WhsCode}
                                              >
                                                {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
                                              </option>
                                            );
                                          })}
                                        </Input>
                                      ) : item.FromWarehouse ? (
                                        this.getWarehouseName(item.FromWarehouse)
                                      ) : (
                                        this.getWarehouseName(item.U_FromWarehouse)
                                      )}
                                    </td>
                                    <td>
                                      {item.fromWarehouseLocation
                                        ? item.fromWarehouseLocation
                                        : "NA"}
                                    </td>
                                    {/* Available Qty in Selected WH */}
                                    {operation === "Create" ? (
                                      // item.availableQuantity ? <td>{parseInt(item.availableQuantity)}</td> : <td>NA</td>
                                      item.availableQuantity ? (
                                        <td>
                                          {/* {parseInt(item.availableQuantity)} */}
                                          <span
                                            id={"availableQuantityPopOverBtn" + key}
                                            className="text-primary text-underline cursor-pointer"

                                            // onMouseEnter={() => this.toggleAvailableQuantityPopOver(key, true)}
                                            // onMouseLeave={() => this.toggleAvailableQuantityPopOver(key, false)}

                                            // onMouseOver={() => this.toggleAvailableQuantityPopOver(key)}
                                            // onMouseOut={() => this.toggleAvailableQuantityPopOver(key)}

                                            // onMouseOver={() => this.toggleAvailableQuantityPopOver(key, true)}
                                            // onMouseOut={() => this.toggleAvailableQuantityPopOver(key, false)}

                                            // onMouseEnter={() => this.openAvailableQuantityPopOver(key)}
                                            // onMouseLeave={() => this.closeAvailableQuantityPopOver(key)}

                                            // onMouseEnter={() => this.toggleAvailableQuantityPopOver(key)}
                                            // onMouseLeave={() => this.toggleAvailableQuantityPopOver(key)}
                                            // onClick={() => this.toggleAvailableQuantityPopOver(key)}

                                            /** NONE of the above worked. Just adding the below attribute to
                                             * <Popover> worked
                                             *    trigger="hover" */
                                          >
                                            {/** Append extra space when it is a single digit no. This is to avoid
                                             * All Availble Qty popup flicker when hovering on a single digit no. */}
                                            {/* !isNaN(parseInt(item.availableQuantity)) && parseInt(item.availableQuantity) < 10
                                              ? `  ${parseInt(item.availableQuantity)}.0  `
                                              : `  ${parseInt(item.availableQuantity)}  `
                                            */}
                                            {!isNaN(parseInt(item.availableQuantity))
                                              ? parseFloat(item.availableQuantity).toFixed(3)
                                              : item.availableQuantity}
                                          </span>
                                          <Popover
                                            placement="left"
                                            trigger="hover" //this will take care of onMousehover
                                            hideArrow={false}
                                            isOpen={this.state.availableQuantityPopOver[key]}
                                            target={"availableQuantityPopOverBtn" + key}
                                            /** NOTE: this DIDN'T work. Created a .scss and added a classss .popover
                                             * set the 'width' prop and it worked
                                             */
                                            // style={{width: "450px"}}
                                            toggle={() =>
                                              this.toggleAvailableQuantityPopOver("WAREHOUSE", key)
                                            }
                                          >
                                            <h4 className="ml-3 mt-2">Available Qty in WHs</h4>
                                            <PopoverBody>
                                              <div
                                                style={{ maxHeight: "380px", overflowY: "auto" }}
                                              >
                                                <Table
                                                  size="sm"
                                                  className="ml--1 mt--2 mb-0 mr--1 table-sm"
                                                >
                                                  <thead style={{ backgroundColor: "#8e7ef324" }}>
                                                    <tr>
                                                      <th scope="col">#</th>
                                                      <th scope="col">Warehouse</th>
                                                      <th scope="col">Quantity</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {Array.isArray(
                                                      item.allWarehouseAvailableQtyList,
                                                    ) &&
                                                    item.allWarehouseAvailableQtyList.length > 0
                                                      ? item.allWarehouseAvailableQtyList.map(
                                                          (warehouse, whKey) => {
                                                            return (
                                                              <tr
                                                                key={warehouse.WhsCode}
                                                                id={"trId" + whKey}
                                                                className="cursor-pointer"
                                                                // style={{cursor: "pointer"}}
                                                                onClick={() =>
                                                                  this.handleRowLevelWarehouseChange(
                                                                    key,
                                                                    item,
                                                                    warehouse.WhsCode,
                                                                    true,
                                                                  )
                                                                }
                                                              >
                                                                <td>{whKey + 1}</td>
                                                                <td className="text-primary">
                                                                  {this.getWarehouseName(
                                                                    warehouse.WhsCode,
                                                                  )}
                                                                </td>
                                                                <td className="text-primary">
                                                                  {parseFloat(warehouse.OnHand)}
                                                                </td>
                                                              </tr>
                                                            );
                                                          },
                                                        )
                                                      : null}
                                                  </tbody>
                                                </Table>
                                              </div>
                                            </PopoverBody>
                                          </Popover>
                                        </td>
                                      ) : (
                                        <td>NA</td>
                                      )
                                    ) : null}
                                    {/* <td>
                                      {operation === "Create" ?
                                      <Input bsSize="sm" type="select" name="select"
                                        value={item.BinCode}
                                        style={{ width: "auto" }}
                                        onChange={(event) =>
                                          this.handleWarehouseBinChange(key, event.target.value, "BIN_LOCATION")
                                        }
                                      >
                                        {this.state.binLocationList.map((bin, key) => {
                                          return (
                                            <option
                                              key={bin.BinCode}
                                              value={bin.BinCode}
                                            >
                                              {bin.BinName}
                                            </option>
                                          )
                                        })}
                                      </Input>
                                      : item.U_FromBinLoc
                                    }
                                    </td> */}
                                    {/* Available Qty in From Bin */}
                                    {operation === "Create" ? (
                                      Array.isArray(item.availableQuantityInBins) &&
                                      item.availableQuantityInBins.length > 0 ? (
                                        <td>
                                          <span
                                            id={"availableQuantityInBinPopOverBtn" + key}
                                            className="text-primary text-underline cursor-pointer"
                                          >
                                            {item.U_FromBinLoc ? item.U_FromBinLoc : "Not Selected"}
                                          </span>
                                          <Popover
                                            placement="left"
                                            trigger="hover" //this will take care of onMousehover
                                            hideArrow={false}
                                            isOpen={this.state.availableQuantityInBinPopOver[key]}
                                            target={"availableQuantityInBinPopOverBtn" + key}
                                            toggle={() =>
                                              this.toggleAvailableQuantityPopOver(
                                                "BIN_LOCATION",
                                                key,
                                              )
                                            }
                                          >
                                            <h4 className="ml-3 mt-2">Available Qty In Bins</h4>
                                            <PopoverBody>
                                              <div
                                                style={{ maxHeight: "380px", overflowY: "auto" }}
                                              >
                                                <Table
                                                  size="sm"
                                                  className="ml--1 mt--2 mb-0 mr--1 table-sm"
                                                >
                                                  <thead style={{ backgroundColor: "#8e7ef324" }}>
                                                    <tr>
                                                      <th scope="col">#</th>
                                                      <th scope="col">Bin Code</th>
                                                      <th scope="col">Quantity</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {item.availableQuantityInBins.map(
                                                      (bin, binKey) => {
                                                        return (
                                                          <tr
                                                            key={bin.BinCode}
                                                            id={"trId" + binKey}
                                                            className="cursor-pointer"
                                                            onClick={() =>
                                                              this.handleRowLevelBinChange(
                                                                key,
                                                                bin.BinCode,
                                                                bin.OnHandQty,
                                                              )
                                                            }
                                                          >
                                                            <td>{binKey + 1}</td>
                                                            <td className="text-primary">
                                                              {bin.BinCode}
                                                            </td>
                                                            <td className="text-primary">
                                                              {parseFloat(bin.OnHandQty).toFixed(2)}
                                                            </td>
                                                          </tr>
                                                        );
                                                      },
                                                    )}
                                                  </tbody>
                                                </Table>
                                              </div>
                                            </PopoverBody>
                                          </Popover>
                                        </td>
                                      ) : (
                                        <td>NA</td>
                                      )
                                    ) : (
                                      <td>{item.U_FromBinLoc}</td>
                                    )}
                                    {/* To Bin Locations */}
                                    <td>
                                      {operation === "Create" ? (
                                        <>
                                          <span
                                            id={"toBinPopOverBtn" + key}
                                            className="text-primary text-underline cursor-pointer"
                                          >
                                            {item.U_ToBinLocation
                                              ? item.U_ToBinLocation
                                              : "Not Selected"}
                                          </span>
                                          <Popover
                                            placement="left"
                                            trigger="hover" //this will take care of onMousehover
                                            hideArrow={false}
                                            isOpen={this.state.toBinListPopOver[key]}
                                            target={"toBinPopOverBtn" + key}
                                            toggle={() => this.toggleRowLevelToBinPopOver(key)}
                                            className="popover-fixed-height"
                                          >
                                            <h4 className="ml-3 mt-2">Requester Bin Locations</h4>
                                            <PopoverBody>
                                              <div
                                                // className="popover-container-md"
                                                style={{ maxHeight: "380px", overflowY: "auto" }}
                                              >
                                                <Table
                                                  size="sm"
                                                  className="ml--1 mt--2 mb-0 mr--1 table-sm"
                                                >
                                                  <thead style={{ backgroundColor: "#8e7ef324" }}>
                                                    <tr>
                                                      <th scope="col">#</th>
                                                      <th scope="col">Bin Code</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {Array.isArray(this.state.toBinLocationList) &&
                                                    this.state.toBinLocationList.length > 0 ? (
                                                      this.state.toBinLocationList.map(
                                                        (bin, binKey) => {
                                                          return (
                                                            <tr
                                                              key={bin.BinCode}
                                                              id={"trId" + binKey}
                                                              className="cursor-pointer"
                                                              onClick={() =>
                                                                this.handleBinChange(
                                                                  "ROW",
                                                                  bin.BinCode,
                                                                  key,
                                                                )
                                                              }
                                                            >
                                                              <td>{binKey + 1}</td>
                                                              <td className="text-primary">
                                                                {bin.BinCode}
                                                              </td>
                                                            </tr>
                                                          );
                                                        },
                                                      )
                                                    ) : (
                                                      <tr>
                                                        <td colSpan="2" className="text-warning">
                                                          Select a <b>Requester Warehouse</b> to
                                                          proceed!
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </tbody>
                                                </Table>
                                              </div>
                                            </PopoverBody>
                                          </Popover>
                                        </>
                                      ) : (
                                        <td>{item.U_ToBinLocation}</td>
                                      )}
                                    </td>
                                    {/* <td>{item.PlannedQty}</td> */}
                                    <td>
                                      {operation === "Create" ? (
                                        <Input
                                          bsSize="sm"
                                          style={{ width: 130 + "%" }}
                                          // style={{ width: "auto" }}
                                          value={item.Quantity}
                                          className={"form-control"} // display-4 text-gray-dark
                                          placeholder=""
                                          type="number"
                                          onChange={(e) =>
                                            this.handleFieldChange("Quantity", e.target.value, key)
                                          }
                                        />
                                      ) : (
                                        parseFloat(item.Quantity).toFixed(2)
                                      )}
                                    </td>
                                    <td>{item.InvntryUom}</td>
                                  </tr>

                                  {
                                    Array.isArray(item.BatchNumbers) && item.BatchNumbers.length > 0
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
                                              <tr key={batch.BatchNumberProperty.toString()}>
                                                <td></td>
                                                <td>{batch.BatchNumberProperty}</td>
                                                <td>{batch.Quantity}</td>
                                              </tr>
                                            </>
                                          );
                                        })
                                      : null
                                    /*Array.isArray(item.SerialNumbers) && item.SerialNumbers.length ?
                                  <td>{item.SerialNumbers.}</td>*/
                                  }
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
              onClick={(e) => this.handleSave(e, draftStatus.REJECTED)}
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
      </>
    );
  }
}
export default StockTransferRequestDetails;

StockTransferRequestDetails.propTypes = {
  operation: PropTypes.string.isRequired,
  //selectedStockTransReq: PropTypes.object.isRequired,
  //setGRPODraftDetails: PropTypes.func.isRequired
};
