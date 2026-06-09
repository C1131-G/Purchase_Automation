import React from "react";
import PropTypes from "prop-types";
import cloneDeep from "lodash.clonedeep";
// node.js library that concatenates classes (strings)
import classnames from "classnames";
// react plugin used to create datetimepicker
import ReactDatetime from "react-datetime";
import moment from "moment";
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
import { Trash2, X, PlusSquare } from "react-feather";
//import PerfectScrollbar from "react-perfect-scrollbar";
import PreviewPrintQRCodes from "../../components/PreviewPrintQRCodes";
import ScanAndSearchBatchSerialItems from "../../components/ScanAndSearchBatchSerialItems";
import ItemsTable from "../../../views/components/ItemsTable";
import ToastMessage from "../../../components/ToastMessage";
import DebouncedInput from "../../../components/DebouncedInput";

import api from "../../../config/api-nodejs";
import {
  scrollToElement,
  formatDate,
  showWarningMsg,
  getRandomNumber,
  generateUniqueNumber,
  round,
  stripHTML,
} from "../../../config/util.js";
import {
  systemCurrency,
  displayModes,
  itemTypes,
  itemTypeProperties,
  itemTypeArrays,
  statusColors,
  objectCodes,
  portalModules,
  isMultiBranchEnabled,
  requestComment,
} from "../../../config/config";

import { getDelivery, createDelivery } from "../../../helper/delivery";
import { getSaleOrderItems } from "../../../helper/sale-order";

// import "../../assets/css/custom-style.scss";
// import"./fixed-header.scss";

class ItemDetails extends React.PureComponent {
  today = ReactDatetime.moment();

  //initializing Ref for "Quantity" Input box. Will be used to focus() it
  quantityRef = [];
  state = {
    operation: displayModes.CREATE,
    error: "",
    displayMode: displayModes.CREATE,
    isLoading: false,
    inValidInput: "",
    selectedBaseRecords: [],
    // poDocEntry: this.props.selectedBaseRecords ? this.props.selectedBaseRecords : "NA",
    // selectedBaseRecordNo: this.props.selectedBaseRecords ? this.props.selectedBaseRecords : "NA",
    selectedBaseRecordNo: [],
    vendorName: this.props.selectedBaseRecords ? this.props.selectedBaseRecords[0].CardName : "NA",
    customerCode: this.props.selectedBaseRecords
      ? this.props.selectedBaseRecords[0].CardCode
      : "NA",
    exchangeRate: this.props.selectedBaseRecords ? this.props.selectedBaseRecords[0].DocRate : "NA",
    currency: this.props.selectedBaseRecords ? this.props.selectedBaseRecords[0].DocCur : "NA",
    discountPercent: this.props.selectedBaseRecords
      ? parseFloat(this.props.selectedBaseRecords[0].DiscountPercent).toFixed(3)
      : 0,
    discLocalCurrency: this.props.selectedBaseRecords
      ? this.props.selectedBaseRecords[0].TotalDiscount
      : 0,
    discForeignCurrency: this.props.selectedBaseRecords
      ? this.props.selectedBaseRecords[0].TotalDiscountFC
      : 0,
    totalPaymentDue: this.props.selectedBaseRecords
      ? this.props.selectedBaseRecords[0].DocTotal
      : 0,
    totalPaymentDueFC: this.props.selectedBaseRecords
      ? this.props.selectedBaseRecords[0].DocTotalFC
      : 0,
    branchId: isMultiBranchEnabled
      ? this.props.selectedBaseRecords
        ? this.props.selectedBaseRecords[0].BPLId
        : 0
      : 1, //Set default branch when multi-branch is not set
    totalBeforeDiscount: 0.0,
    postingDate: "",
    customerRefNo: "",
    remarks: "",
    itemsList: [],
    freightInfo: [],
    showLastItemRemovalWarning: false,
    invalidItemQuantity: false,
    quantityTooltip: [],
    //quantityFocus: [],
    //blankQuantityTextbox: "",
    dropdownOpen: [],
    branchList: [],
    warehouseList: [],
    binLocationList: [],
    binListPopOver: [],
    allFreightList: [],
    freightDropdownList: [],
    // binLocationList: [
    //   { BinCode: "A-1-A-0-S1", BinName: "B1"},
    //   { BinCode: "B-1-A-0", BinName: "A1"}
    // ],
    invalidInput: {},
    warningMsg: "",
    successMsg: "",
    popupWindow: false,
    freightPopOver: false,
    itemRowEffect: [],
    totalQuantity: [],
    normalItemsList: [],
    batchItemsList: [],
    serialNoItemsList: [],
  };

  toggleComponent = (name) => {
    console.log("toggleModal");
    this.setState({
      [name]: !this.state[name],
    });
  };

  togglePopover = (name) => {
    this.setState({ [name]: !this.state[name] });
  };

  /**
   * Auto clears warning & success msgs that are displayed in Toast
   * @param {String} name  Name of the 'state' varable, 'warningMsg' or 'successMsg'
   */
  clearToastMessage = (name) => {
    setTimeout(() => this.setState({ [name]: "" }), 4000);
  };

  /**
   * Update Quantity changed in the Items Table
   * @param {String} value      Selected value
   * @param {Number} key        Index
   */
  handleQuantityChange = (value, key) => {
    this.setState({ warningMsg: "" });
    if (value > -1) {
      let itemsList = cloneDeep(this.state.itemsList);

      if (!itemsList[key].originalQty) {
        itemsList[key].originalQty = itemsList[key].Quantity;
      }

      // if(value > parseInt(itemsList[key].originalQty)) {
      //   this.setState({ warningMsg: "Quantity cannot be greater than the Requested quantity" });
      // }
      // else {
      itemsList[key].Quantity = value;
      this.setState({ itemsList });
      // }
    }
  };

  /**
   * Returns the sum of Quantities for Batches/Serials under an item
   * @param {Array} batchSerialRecords  Array of Batch or Serial Items
   */
  getTotalQuantity = (batchSerialRecords) => {
    let total = 0;
    batchSerialRecords.forEach((e) => {
      total = +total + parseFloat(e.Quantity);
    });
    return total;
  };

  addScannedItemToRow = (scannedItem, itemsList) => {
    let newItem = {
      // LineNumber: 1,
      ItemCode: scannedItem.ItemCode,
      WarehouseCode: scannedItem.WhsCode,
      BinAbsEntry: scannedItem.BinAbsEntry,
      BinCode: scannedItem.BinCode,
      // LineStatus: "clsOpen"
    };
    if (scannedItem.BatchNumberProperty) {
      newItem.BatchNumbers = [
        {
          BatchNumber: scannedItem.BatchNumberProperty,
          ItemCode: scannedItem.ItemCode,
          Quantity: parseFloat(scannedItem.OnHandQty),

          /** NOTE: below prop will be used for comparison in handleQuantityChange()
           * method when user tries to change the scanned Qty.
           * This will not be added in teh payload*/
          ScannedQuantity: parseFloat(scannedItem.OnHandQty),

          BinAbsEntry: scannedItem.BinAbsEntry,
          BinCode: scannedItem.BinCode,
          // Quantity: 133.0,
          // BaseLineNumber: 1,
        },
      ];
    } else if (scannedItem.InternalSerialNumber) {
      newItem.SerialNumbers = [
        {
          InternalSerialNumber: scannedItem.InternalSerialNumber,
          ItemCode: scannedItem.ItemCode,
          Quantity: parseFloat(scannedItem.OnHandQty),
          ScannedQuantity: parseFloat(scannedItem.OnHandQty),
          // Quantity: 133.0,
          // BaseLineNumber: 1,

          //Adding the Bin info., just in case it is required for 'Multi-Bin under a Batch' scenario
          BinAbsEntry: scannedItem.BinAbsEntry,
          BinCode: scannedItem.BinCode,
        },
      ];
    }

    itemsList.push(newItem);
    this.setState({
      successMsg: `${
        scannedItem.BatchNumberProperty
          ? scannedItem.BatchNumberProperty
          : scannedItem.InternalSerialNumber
      } has been successfully added!`,
    });
    this.clearToastMessage("successMsg");
    return itemsList;
  };

  /**
   * Adds the scanned Batch/Serial# to appropriate Item
   * @param {Array}  scannedBatchSerialRec Scanned Batch/Serial record
   * @param {Array}  itemsList             Array of Items, to which teh scanned rec. must be added
   * @param {Number} itemIndex             Index of the current item
   * @returns
   */
  addBatchSerialToItem = (scannedBatchSerialRec, itemsList, itemIndex) => {
    let arrayProp, newNumberProp, scannedNumberProp;
    // if(type === itemTypes.BATCHES) {
    if (scannedBatchSerialRec.BatchNumberProperty) {
      arrayProp = itemTypeArrays.BATCH_NUMBERS;
      newNumberProp = itemTypeProperties.BATCH_NUMBER;
      scannedNumberProp = itemTypeProperties.BATCH_NUMBER_OLD; //"BatchNumberProperty";
    }
    // else if(type === itemTypes.SERIAL_NUMBERS) {
    else if (scannedBatchSerialRec.InternalSerialNumber) {
      arrayProp = itemTypeArrays.SERIAL_NUMBERS;
      newNumberProp = itemTypeProperties.SERIAL_NUMBER;
      scannedNumberProp = itemTypeProperties.SERIAL_NUMBER;
    }

    //TODO: Use an array instead, to handle cases where same Batch/Sr# in diff. Bin are scanned more
    //than twice
    let index = -1; //[]
    //Check if `BatchNumbers` or `SerialNumbers` array exist in the `itemList`
    if (
      itemsList[itemIndex][arrayProp] &&
      Array.isArray(itemsList[itemIndex][arrayProp]) &&
      itemsList[itemIndex][arrayProp].length > 0
    ) {
      // itemsList[itemIndex].BatchNumbers.findIndex(batch => {
      index = itemsList[itemIndex][arrayProp].findIndex((batch) => {
        return batch[newNumberProp] === scannedBatchSerialRec[scannedNumberProp];
        // || batch[scannedNumberProp] === scannedBatchSerialRec[scannedNumberProp])
      });
    }

    console.log(
      "itemsList[itemIndex][arrayProp]: ",
      JSON.stringify(itemsList[itemIndex][arrayProp]),
    );
    console.log("index: ", index);
    if (index > -1) {
      //If the same Batch/Serial# with same Bin is scanned more than once
      //NOTE: 2nd cond. added to allow users to add/scan a diff. Item that has the same Batch/Serial#
      //as another Item that's already added to 'row'
      if (
        itemsList[itemIndex][arrayProp][index].BinAbsEntry === scannedBatchSerialRec.BinAbsEntry &&
        itemsList[itemIndex].ItemCode === scannedBatchSerialRec.ItemCode
      ) {
        this.setState({
          warningMsg: `${scannedBatchSerialRec[scannedNumberProp]} you are trying to add is already been added.
            Please try a different one!`,
        });
        this.clearToastMessage("warningMsg");
        return;
      }
      //if the same Batch/Serial# with diff. Bin is scanned, add it in a different 'row'
      else {
        itemsList = this.addScannedItemToRow(scannedBatchSerialRec, itemsList);
      }
    }
    //If the Batch/Serial# is not already added
    else {
      const newRecord = {
        [newNumberProp]: scannedBatchSerialRec[scannedNumberProp],
        ItemCode: scannedBatchSerialRec.ItemCode,
        Quantity: parseFloat(scannedBatchSerialRec.OnHandQty),
        ScannedQuantity: parseFloat(scannedBatchSerialRec.OnHandQty),
        // Quantity: 133.0,
        // BaseLineNumber: 1,

        // //Adding the Bin info., just in case it is required for 'Multi-Bin under a Batch' scenario
        BinAbsEntry: scannedBatchSerialRec.BinAbsEntry,
        BinCode: scannedBatchSerialRec.BinCode,
        NewLineNum: itemIndex,
      };

      //Push the newly scanned record to the array if it exists
      if (itemsList[itemIndex][arrayProp] && Array.isArray(itemsList[itemIndex][arrayProp])) {
        itemsList[itemIndex][arrayProp].push(newRecord);
      }
      //or create one & add it in
      else {
        itemsList[itemIndex][arrayProp] = [newRecord];
      }

      //updated the Item level 'Qty'
      // itemsList[itemIndex].Quantity = this.getTotalQuantity(itemsList[itemIndex][arrayProp]);

      this.setState({
        successMsg: `${scannedBatchSerialRec[scannedNumberProp]} has been successfully added!`,
      });
      this.clearToastMessage("successMsg");
    }
    return itemsList;
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

    let itemsList = cloneDeep(this.state.itemsList);

    if (Array.isArray(itemsList) && itemsList.length > 0) {
      const itemIndex = itemsList.findIndex(
        (item) => item.ItemCode === scannedBatchSerialRec.ItemCode,
      );

      if (
        isNaN(itemsList[itemIndex].AddedQuantity) ||
        parseFloat(itemsList[itemIndex].AddedQuantity) == 0 ||
        // || itemsList[itemIndex].AddedQuantity == "0"
        parseFloat(itemsList[itemIndex].AddedQuantity) < parseFloat(itemsList[itemIndex].Quantity)
      ) {
        if (itemIndex > -1) {
          itemsList = this.addBatchSerialToItem(scannedBatchSerialRec, itemsList, itemIndex);

          //If the scanned batch/sr has been added successfully update AddedQuantity
          if (itemsList) {
            //Set AddedQuantity value if it is the 1st scanned bat./sr. or add the qty to the
            //existing value
            //NOTE: this field is only for validation purpose, it will not be sent to the API
            if (isNaN(itemsList[itemIndex].AddedQuantity)) {
              // || parseFloat(itemsList[itemIndex].AddedQuantity) === 0
              itemsList[itemIndex].AddedQuantity = parseFloat(scannedBatchSerialRec.OnHandQty);
            } else {
              itemsList[itemIndex].AddedQuantity =
                parseFloat(itemsList[itemIndex].AddedQuantity) +
                parseFloat(scannedBatchSerialRec.OnHandQty);
            }
            this.setState({ itemsList });
          }
        } else {
          //This is NOT required for Sale Order & ST, perhaps needed for Inventory Counting
          // itemsList = this.addScannedItemToRow(scannedBatchSerialRec, itemsList);

          this.setState({
            warningMsg:
              "The item you attempted to add doesn't match any of the items in the below table. " +
              "Or the entered item's WH doesn't match the From WH in the table.",
            batchSerialNo: "",
          });
          this.clearToastMessage("warningMsg");
        }
      }
    } else {
      //This is NOT required for Sale Order & ST, perhaps needed for Inventory Counting
      // itemsList = this.addScannedItemToRow(scannedBatchSerialRec, itemsList);
    }
    // this.setState({ itemsList });
  };

  //Set the updated Items List that's returned from the child comps.
  updateItemsList = (itemsList) => {
    this.setState({ itemsList });
  };

  /**
   * TODO: Need to compare this method with the one in ScanAndSearchBat... & remove unwanted code here
   * Removes Batch or Serial under a particular Item
   * @param {String} itemType   Batch or Serial
   * @param {Number} itemKey    Index of the current 'row' in the able
   * @param {Number} batchSerialKey Index of the current Batch or Serial under the current 'row'
   */
  handleDeleteBatchSerial = (itemType, itemKey, batchSerialKey) => {
    this.setState({ warningMsg: "" });
    let itemsList = cloneDeep(this.state.itemsList);

    let deletedBatchNum, deletedSerialNum;

    if (itemType === itemTypes.BATCHES) {
      console.log(
        "itemsList[itemKey].BatchNumbers[batchSerialKey].Quantity: " +
          itemsList[itemKey].BatchNumbers[batchSerialKey].Quantity,
      );
      deletedBatchNum = itemsList[itemKey].BatchNumbers[batchSerialKey].BatchNumberProperty;

      //remove the selected Batch from the row
      itemsList[itemKey].BatchNumbers.splice(batchSerialKey, 1);

      //reduce the current Batch item's Qty (that is selected for deletion) from the
      //Quantity of the item
      itemsList[itemKey].AddedQuantity = this.getTotalQuantity(itemsList[itemKey].BatchNumbers);
      // parseFloat(itemsList[itemKey].Quantity) - batchQty;
    } else if (itemType === itemTypes.SERIAL_NUMBERS) {
      deletedSerialNum = itemsList[itemKey].SerialNumbers[batchSerialKey].InternalSerialNumber;

      //remove the selected Serial from the Item
      itemsList[itemKey].SerialNumbers.splice(batchSerialKey, 1);

      //reduce the current Serial item's Qty (that is selected for deletion) from the
      //AddedQty of the item
      itemsList[itemKey].AddedQuantity = this.getTotalQuantity(itemsList[itemKey].SerialNumbers);
    }

    this.setState({
      itemsList,
      successMsg: "Selected Batch/Serial no. has been removed!",
    });
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
   * Adds new Freight Info
   */
  handleAddFreight = () => {
    let freightInfo = this.state.freightInfo ? cloneDeep(this.state.freightInfo) : [];
    let freightDropdownList = cloneDeep(this.state.freightDropdownList);

    if (Array.isArray(freightInfo) && freightInfo.length > 0) {
      freightInfo.forEach((freight) => {
        if (freight.isNew) {
          freight.isNew = false; //to disable dropdown for the last added Freight

          for (let i = 0; i < freightDropdownList.length; i++) {
            //remove the Freight from the drodown that are already added to freightInfo
            if (freight.FreightCode === freightDropdownList[i].FreightCode) {
              freightDropdownList.splice(i, 1);
              break;
            }
          }
        }
      });
    }
    //add a new Freight rec. only when teh dropdown has more than 1 Freight
    //if the length is Not > 0 it means all the Freights are already added to 'freightInfo'
    if (freightDropdownList.length > 0) {
      let newFreightInfo = {
        isNew: true,
        // FreightCode: allFreightList[0].FreightCode,
        // FreightName: allFreightList[0].FreightName,
        FreightCode: freightDropdownList[0].FreightCode,
        FreightName: freightDropdownList[0].FreightName,
        FreightAmount: 0.0,
        FreightAmountFC: 0.0,
      };
      freightInfo.push(newFreightInfo);

      this.setState({
        freightInfo,
        freightDropdownList,
      });
    }
  };

  /**
   * Deletes selected Freight rec., adds the deleted Freight back to freightDropdownList
   *  & subtracts the deleted amount from FreightTotal & FreightTotalFC
   * @param {Number} key  Position of the record
   */
  handleDeleteFreight = (key) => {
    let freightAmount = 0,
      freightAmountFC = 0;
    let { freightTotal, freightTotalFC } = this.state;
    let freightInfo = cloneDeep(this.state.freightInfo);

    /** TODO: Added belwo code to auto add Freights to dropdown list when it is removed frm
    'freightInfo'. That wasnt working as expected. Few test cases failed. So commenting
    it for now. Will revisit if I get time.
     */

    //add the deleted Freight rec. back into the dropdown list if the deleted freight is 'NOT isNew'
    //NOTE: Freight dropdown will be disabled for recs. NOT marked as 'isNew', so deletign them
    //shouldnt add that Freight item to dropdown list
    let freightDropdownList = [...this.state.freightDropdownList];
    if (!freightInfo[key].isNew) {
      const { allFreightList } = this.state;
      for (let i = 0; i < allFreightList.length; i++) {
        if (allFreightList[i].FreightCode === freightInfo[key].FreightCode) {
          //add the Freight rec. as the 1st record in the list
          freightDropdownList.unshift({
            FreightCode: allFreightList[i].FreightCode,
            FreightName: allFreightList[i].FreightName,
          });
          break;
        }
      }
      this.setState({ freightDropdownList });
    }

    if (Array.isArray(freightInfo) && freightInfo.length > 0) {
      if (!isNaN(freightInfo[key].FreightAmount)) {
        freightAmount = parseFloat(freightInfo[key].FreightAmount);
      }
      if (!isNaN(freightInfo[key].FreightAmountFC)) {
        freightAmountFC = freightInfo[key].FreightAmountFC;
      }
      freightInfo.splice(key, 1);
      this.setState({
        freightInfo,
        freightTotal: freightTotal - freightAmount,
        freightTotalFC: freightTotalFC - freightAmountFC,
      });
    }
  };

  /**
   * Handles Freight dropdown change in the Freight Info popover
   * @param {Number} key           Index of the changed Freight rec.
   * @param {String} selectedCode  newly selected Freight coded
   */
  handleFreightChange = (key, selectedCode) => {
    //NOTE: the 'code' ws coming in as a String, so using it for below comparision & value assignment
    //resulted in all sort of problems when the dropdown value is changed in the Freight popover.
    //Things worked fine when the dropdown wasn't changed. Found this by DEBUGing this method
    selectedCode = parseInt(selectedCode);
    let freightInfo = cloneDeep(this.state.freightInfo);

    /* TODO: Added belwo code to auto remove Freights from dropdown list when it is added to
    'freightInfo'. That wasnt working as expected. Few test cases failed. So commenting
    it for now. Will revisit if I get time.
    */
    const { allFreightList } = this.state;
    for (let i = 0; i < allFreightList.length; i++) {
      if (allFreightList[i].FreightCode === selectedCode) {
        //get the Freight Name for the selected freight & set it to 'freightInfo'
        freightInfo[key].FreightName = allFreightList[i].FreightName;
        break;
      }
    }
    freightInfo[key].FreightCode = selectedCode;
    console.log("handleFreightChange - freightInfo: " + JSON.stringify(freightInfo));
    this.setState({ freightInfo });
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

  /** Returns array of BinAllocations for a created Batch or Serial list.
   * Below is a sample return value
    {
      "BinAbsEntry": 1572,
      "Quantity": 900,
      "BaseLineNumber": 0,
      "SerialAndBatchNumbersBaseLine": 0,
    }
   * @param {Array}  createdList createdBatchList or createdSerialNoList
   * @param {Number} lineNum     Item's 'new' LineNum (NOT carryforwarded from PO), starting from "0"
   * @param {Number} binAbsEntry BinAbsEntry
  */
  getBinAllocationInfo = (createdList, lineNum, itemType) => {
    let binAllocationList = [];

    if (itemType === itemTypes.SERIAL_NUMBERS) {
      let baseLineNo = 0;
      let binAllocation = {};

      for (let i = 0; i < createdList.length; i++) {
        if (createdList[i].BaseLineNumber === lineNum) {
          binAllocation = {
            BinAbsEntry: createdList[i].BinAbsEntry,
            BinCode: createdList[i].BinCode, //Added for 'QC Module'. BinCode NOT Required for GRPO creation
            Quantity: createdList[i].Quantity,
            BaseLineNumber: lineNum,
            //Added below prop to fix 'Invalid "SerialAndBatchNumbersBaseLine"' error
            SerialAndBatchNumbersBaseLine: baseLineNo, //this links the Bin with the 'Batch' record
          };
          binAllocationList.push(binAllocation);
          baseLineNo++;
        }
      }
    }
    //for Batch Items with Multi-Bin
    else if (itemType === itemTypes.BATCHES) {
      let baseLineBins = createdList.filter((item) => item.BaseLineNumber === lineNum);
      if (Array.isArray(baseLineBins) && baseLineBins.length > 0) {
        baseLineBins.forEach((bin) => {
          // binAllocationList.concat(bin.DocumentLinesBinAllocations);
          binAllocationList.push(...bin.DocumentLinesBinAllocations);
        });
      }
    }
    console.log(JSON.stringify("getBinAllocationInfo:" + JSON.stringify(binAllocationList)));
    return binAllocationList;
  };

  /** Returns array of BatchNumber or SerialNumber based on the "itemType" passed. Below are sample return values
   ** Batch item, {
        //NOTE: Added -POS suffix for filtering old Items that created b4 POS, that don't have QR Codes
   *    "BatchNumberProperty":"2004211-21/05/2020-0047256006-POS",
   *    "Quantity":8,
   *    "BaseLineNumber":3,
   *    "ItemCode": 8211    //this will NOT be included in the returned obj. array
   * }
   ** SerialNo. item, {
   *    "InternalSerialNumber":"T/20/1590047258185-POS",
   *    "Quantity":4,
   *    "BaseLineNumber":1,
   *    "ItemCode": 9614    //this will NOT be included in the returned obj. array
   * }
   * ItemCode will be removed from the above Objects, as it is required ONLY for QR Code generation
   * but not sent to the API for Target Record creation
   * @param {String} itemType
   * @param {Array}  createdList createdBatchList or createdSerialNoList
   * @param {Number} lineNum     Item's 'new' LineNum (NOT carryforwarded from PO), starting from "0"
  */
  getBatchSerialNos = (itemType, createdList, lineNum) => {
    let batchORSerialNumbersList = [];
    let batchORSerialNumber = {};
    let propertyKey =
      itemType === itemTypes.BATCHES ? "BatchNumberProperty" : "InternalSerialNumber";

    //console.log("propertyKey: "+propertyKey);
    for (let i = 0; i < createdList.length; i++) {
      if (createdList[i].BaseLineNumber === lineNum) {
        batchORSerialNumber = {
          //BatchNumberProperty: createdList[i].BatchNumberProperty,
          Quantity: createdList[i].Quantity,
          BaseLineNumber: lineNum,
        };
        batchORSerialNumber[propertyKey] =
          itemType === itemTypes.BATCHES
            ? createdList[i].BatchNumberProperty
            : createdList[i].InternalSerialNumber;
        batchORSerialNumbersList.push(batchORSerialNumber);
      }
    }
    //console.log(JSON.stringify("batchORSerialNumbersList:" +JSON.stringify(batchORSerialNumbersList)));
    return batchORSerialNumbersList;
  };

  scrollToInvalidRow = (rowIndex) => {
    const rowWithInvalidData = document.getElementById("trId" + rowIndex);
    rowWithInvalidData.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /**
   * Validates the entered data before submitting them to the backend
   */
  validateRequest = () => {
    const { itemsList, customerRefNo, discountPercent, branchId } = this.state;
    let invalidItemQuantity = false,
      warehouseLocationsNotSame = false,
      indexOfInvalidRow = -1,
      insufficientQty = false,
      incorrectQty = false,
      problemItem = "";

    let warningMsg = "";
    console.log("invalidItemQuantity: " + invalidItemQuantity);
    if (customerRefNo === "") {
      warningMsg = "Enter a Customer Reference#";
      this.setState({ inValidInput: "is-invalid" });
    } else if (!branchId) {
      warningMsg = "Select a Branch";
    } else if (parseFloat(discountPercent) > 100) {
      warningMsg = "Discount % cannot be greater than 100";
    } else {
      for (let i = 0; i < itemsList.length; i++) {
        //Before submitting the request check if ALL the Quantity textboxes have a valid value
        if (itemsList[i].Quantity === "" || itemsList[i].Quantity == "null") {
          indexOfInvalidRow = i;
          invalidItemQuantity = true;
          problemItem = itemsList[i].ItemCode;
          break;
        }

        if (isNaN(itemsList[i].AddedQuantity) || parseFloat(itemsList[i].AddedQuantity) == 0) {
          indexOfInvalidRow = i;
          insufficientQty = true;
          problemItem = itemsList[i].ItemCode;
          break;
        } else if (parseFloat(itemsList[i].AddedQuantity) != parseFloat(itemsList[i].Quantity)) {
          // else if(parseInt(itemsList[i].AddedQuantity) < parseInt(itemsList[i].Quantity)) {
          indexOfInvalidRow = i;
          incorrectQty = true;
          problemItem = itemsList[i].ItemCode;
          break;
        }
        //check if all the WH Location is same for all the Items,
        //by comparing 1st item's Location with all others items

        //NOT Required for Delivery
        // if(itemsList[i].LocationCode != itemsList[0].LocationCode || !itemsList[i].LocationCode) {
        //   indexOfInvalidRow = i;
        //   warehouseLocationsNotSame = true;
        //   break;
        // }
      }
      if (warehouseLocationsNotSame) {
        warningMsg = "Please select same Warehouse Location for all the items";
        this.scrollToInvalidRow(indexOfInvalidRow);
      } else if (invalidItemQuantity) {
        warningMsg = "Enter a valid Quantity for all Items";
        this.scrollToInvalidRow(indexOfInvalidRow);
      } else if (insufficientQty) {
        warningMsg = `Please add the requested quantity for Item ${problemItem} to proceed`;
        this.scrollToInvalidRow(indexOfInvalidRow);
      } else if (incorrectQty) {
        warningMsg = `Item ${problemItem}'s Added Quantity is not same as the Requested Quantity! Please scan & add additional quantity or reduce the requested Qty to proceed`;
        this.scrollToInvalidRow(indexOfInvalidRow);
      }
    }

    if (warningMsg) {
      this.setState({ warningMsg });
      return false;
    }
    return true;
  };

  /**
   * Creates request "payload" to create Target Record.
   */
  processRequest = async () => {
    if (this.validateRequest()) {
      console.log("processRequest");
      let documentLines = [],
        additionalExpenses = [],
        request = {};
      const { freightInfo } = this.state;
      let itemsList = cloneDeep(this.state.itemsList);

      if (Array.isArray(itemsList) && itemsList.length) {
        let reqItem = {},
          batchNumbers = [],
          serialNumbers = [],
          documentLinesBinAllocations = [];
        itemsList.forEach((item, itemKey) => {
          if (Array.isArray(item.BatchNumbers) && item.BatchNumbers.length) {
            item.BatchNumbers.forEach((batch, batchKey) => {
              reqItem = {};
              reqItem.BaseLineNumber = itemKey;
              reqItem.Quantity = batch.Quantity;
              reqItem.BatchNumber = batch.BatchNumber;
              batchNumbers.push(reqItem);

              //Add 'From Bin Location' details for each 'Batch' under each 'row' to 'Bin Allocation' array
              documentLinesBinAllocations.push({
                BinAbsEntry: batch.BinAbsEntry,
                Quantity: batch.Quantity,
                AllowNegativeQuantity: "tNO",
                /** NOTE: Replaced '0' with 'batchKey' to fix below err when more than one Batch/Serial no.
                 * is scanned/added under an item
                 *    1470000307 - Duplicate bin locations have been removed
                 */
                SerialAndBatchNumbersBaseLine: batchKey,
                BaseLineNumber: itemKey,
              });
            });
          }
          if (Array.isArray(item.SerialNumbers) && item.SerialNumbers.length) {
            item.SerialNumbers.forEach((serial, serialKey) => {
              reqItem = {};
              reqItem.BaseLineNumber = itemKey;
              reqItem.Quantity = serial.Quantity;
              reqItem.InternalSerialNumber = serial.InternalSerialNumber;
              serialNumbers.push(reqItem);

              //Add 'From Bin Location' details for each 'Serial' under each 'row' to 'Bin Allocation' array
              documentLinesBinAllocations.push({
                BinAbsEntry: serial.BinAbsEntry,
                Quantity: serial.Quantity,
                AllowNegativeQuantity: "tNO",
                SerialAndBatchNumbersBaseLine: serialKey,
                BaseLineNumber: itemKey,
              });
            });
          }

          documentLines.push({
            LineNum: itemKey,
            ItemCode: item.ItemCode,
            Quantity: item.Quantity,
            MeasureUnit: item.InvntryUom,

            //below error was thrown when submitting ST bcoz of setting 'itemKey' as 'BaseLine'
            //  "Target item number does not match base item number. [WTR1.ItemCode][line: 0] [Hlásenie 3513-3]"
            //so added "LineNum" col. to the query that pulls Item Details & added below prop to fix it
            // BaseLine: itemKey,

            BaseType: objectCodes[portalModules.SALES_ORDER],
            BaseEntry: item.DocEntry,
            BaseLine: item.LineNum,

            BatchNumbers: batchNumbers,
            SerialNumbers: serialNumbers,

            DocumentLinesBinAllocations: documentLinesBinAllocations,
          });
          batchNumbers = [];
          serialNumbers = [];
          //must reset this array for each row or the bin allocations that belongs to each row will be added to all the items
          //This caused "1470000307 - Duplicate bin locations have been removed" err when submitting ST
          documentLinesBinAllocations = [];
        });
      }

      let freight = {};
      freightInfo.forEach((item, key) => {
        freight = {
          // BaseDocumentReference: item.DocNum
          LineNum: key,
          ExpenseCode: item.FreightCode,
          LineTotal:
            this.state.currency === systemCurrency ? item.FreightAmount : item.FreightAmountFC,
          /** sending Foreign Curr. Freight amount via 'LineTotalFC' didn't work! The recs. didnt get saved.
           * sending it via 'LineTotal' like above automatically saved the amount to 'LineTotalFC' in the backend
           * and saved the Local Currecny equivalent amount in 'LineTotal' & 'LineTotalSys' fields
           */
          //LineTotalFC: item.FreightAmountFC
        };
        if (item.DocEntry && item.LineNum) {
          freight.BaseDocEntry = item.DocEntry;
          freight.BaseDocLine = item.LineNum;
          // freight.freight = objectCodes[portalModules.SALES_ORDER]; //This was causing the Freaking "Socket Hang up issue"
          freight.BaseDocType = objectCodes[portalModules.SALES_ORDER];
        }
        additionalExpenses.push(freight);
        freight = {};
      });

      request = {
        //moved this to API
        //DocTotal: this.state.totalPaymentDue, //sending this leads to miscalculation in the created Draft/GRPO
        DiscountPercent: this.state.discountPercent,
        TotalDiscount:
          this.state.currency === systemCurrency
            ? this.state.discLocalCurrency
            : this.state.discForeignCurrency,
        //TotalDiscountFC: this.state.discForeignCurrency,

        //NOTE: below prop added to fix [In "Amount (FC)" "From" field, enter a number , 'LKR'] during GRPO
        //creating with multiple POs
        DocCurrency: this.state.currency,
        CardCode: this.state.customerCode,
        NumAtCard: this.state.customerRefNo,
        DocDate: moment(this.state.postingDate).format("YYYY-MM-DD"),
        Comments: requestComment + this.state.remarks,
        DocumentLines: documentLines,
        DocumentAdditionalExpenses: additionalExpenses,
        userId: localStorage.getItem("InternalKey"),
      };
      if (this.state.branchId) {
        request.branchId = this.state.branchId;
      }
      await this.submitRequest(request);
    }
  };

  /**
   * Submits the request to the backend
   * @param {Object} request        Request payload to be sent to the API
   */
  submitRequest = async (request) => {
    this.setState({ isLoading: true, displayMode: displayModes.VIEW });

    console.log("submitRequest: " + JSON.stringify(request));
    // return;
    try {
      let response = await createDelivery(request);
      // let response = await api.post("/service/delivery", request); //?prefer=return-no-content
      console.log("submitRequest - response: " + JSON.stringify(response));
      if (response.docNum) {
        this.setState({
          successMsg: `Delivery# ${response.docNum} has been created successfully!`,
          docNum: response.docNum,
          operation: displayModes.VIEW, //to hide Submit button
        });
      } else if (response.draftNum) {
        let successMsg = `Delivery request# <b>${response.draftNum}</b> has been created successfully.`;
        if (response.gatePassNum) {
          successMsg =
            successMsg + `Gate Pass# <b>${response.gatePassNum}</b> has been created successfully!`;
        }
        if (response.approverName) {
          successMsg =
            successMsg + ` and submitted to <b>${response.approverName}</b> for approval!`;
        }
        //If approverName is not present in the response, it means the req. is sent to QC Team
        // else {
        //   successMsg = successMsg + ` and submitted to QC Team!`;
        // }
        this.setState({
          successMsg,
          draftNum: response.draftNum,
          operation: displayModes.VIEW, //to hide Submit button
        });
        console.log("Draft response: " + JSON.stringify(response));
      } else if (response.message) {
        this.setState({ warningMsg: response.message });
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
      let warningMsg = "Unable to create GRPO!";
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

    //Sample
    /** DocumentLines: [
    {
      "ItemCode": "TKFT0016",
      "Quantity": 3,
      "BaseType": 17,
      "BaseEntry": selectedBaseRecordNo,
      "BaseLine": 6,
      "BatchNumbers": [
        {
            "BatchNumber": "C1",
            "Quantity": 2,
            "BaseLineNumber": 6,
        },
        {
            "BatchNumber": "C2",
            "Quantity": 1,
            "BaseLineNumber": 6,
        }
      ],
      "SerialNumbers":[]
    }] */
  };

  /**
   * Compares the sum of all Batch/SerialNo Quantities in the Created Batch/Serial
   * with the selected Item's Quanity
   * and returns the difference
   * @param {Array} itemsList Filtered Items list in the popup window
   * @param {Numer} key       Index of the element in the itemsList Array
   */
  getQuantityDifference = (itemsList, key) => {
    let totalQuantity = 0;
    for (let i = 0; i < itemsList.length; i++) {
      totalQuantity += itemsList[i].Quantity;
    }
    console.log("totalQuantity: " + totalQuantity);
    //console.log("itemsList[key].TotalQuantity: "+itemsList[key].TotalQuantity)
    return parseFloat(itemsList[key].TotalQuantity) - parseFloat(totalQuantity);
  };

  /** Disables future dates in the ReactDatetime component
   * @param {Moment Object} current We don't need to pass this argument, moment will automatically send it.
   * @returns "true" for the dates that match the given criteria- dates Before Today.
   */
  disableFutureDates = (current) => {
    return current.isBefore(this.state.serverDateTime);
  };

  /** Check if the obj. passed is a valid Moment object before calling the format() funct.
   * This is to avoid the error that was thrown when user uses the keyboard to update the date
   */
  handleDateChange = (momentObj) => {
    if (moment.isMoment(momentObj))
      this.setState({ postingDate: momentObj.format("MMMM D, YYYY") });
    else {
      this.setState({ postingDate: this.state.serverDateTime });
    }
  };

  handleDateBlur = (momentObj) => {
    //console.log("handleDateBlur");
    if (!moment.isMoment(momentObj)) this.setState({ postingDate: this.state.serverDateTime });
    else console.log("handleDateBlur - ELSE");
  };

  /**
   * Reset the Warehouse, Location & Bin Location details all the item
   */
  resetItemWarehouseBinDetails = () => {
    let itemsList = cloneDeep(this.state.itemsList);
    itemsList.forEach((item) => {
      item.WhsCode = "";
      item.BinCode = "";
      item.BinAbsEntry = "";
      item.binLocationList = [];
      item.LocationCode = "";
      item.LocationName = "";
    });
    this.setState({ itemsList });
  };

  /**
   * Sets the selected Warehouse Code to state var.
   * @param {String} stateVariable  warehouse
   * @param {String} warehouseCode  selected Warehouse Code
   * @param {Boolean} isConfirmed   bool. to check if user has confirmed that changing Warehouse will affect all
   *                                the Row level items' From Warehouses too
   */
  handleWarehouseChange = async (stateVariable, warehouseCode, isConfirmed = false) => {
    let itemsList = cloneDeep(this.state.itemsList);
    let binLocationList = [];
    if (warehouseCode) {
      binLocationList = await this.getBinsAndItemQtyForWarehouse("BINS", warehouseCode);
    }

    if (!isConfirmed) {
      this.setState({ [stateVariable]: warehouseCode, binLocationList, warehousePopover: true });
    } else {
      this.setState({ isLoading: true, warehousePopover: false });

      let selectedWH;
      if (warehouseCode) {
        //Get the WH record for the selected WH
        selectedWH = this.state.warehouseList.filter((wh) => wh.WhsCode == warehouseCode);
        console.log("selectedWH: " + JSON.stringify(selectedWH));
      }
      // if(warehouseCode) {
      itemsList.forEach((item) => {
        item.WhsCode = warehouseCode ? warehouseCode : "";
        item.BinCode = "";
        item.BinAbsEntry = "";
        item.binLocationList = warehouseCode ? binLocationList : [];

        //Added to fix WH Location mismatch issue where Row level WH Locs. dont change when
        //WH is changed in the Header level
        item.LocationCode = selectedWH ? selectedWH[0].LocationCode : "";
        item.LocationName = selectedWH ? selectedWH[0].LocationName : "";
      });
      // }
      this.setState({ isLoading: false, itemsList, binLocationList });
    }
  };

  /**
   * Calculates tax for the Item based on the values passed. Here the params will be parsed into 'Float'
   * @param {String} quantity   Quantity of the item
   * @param {String} unitPrice  Unit Price of the item
   * @param {String} discountPercent
   * @param {String} taxPercent Tax % of the item
   */
  calculateRowLevelTax = (quantity, unitPrice, discountPercent, taxPercent) => {
    //TaxAmt = ((Qty * Price) - Discount) * Tax %
    if (!taxPercent || isNaN(parseFloat(taxPercent))) {
      return 0;
    } else {
      const itemTotal = parseFloat(quantity) * parseFloat(unitPrice);
      const itemDiscount = (itemTotal * parseFloat(discountPercent)) / 100;
      const amountAfterDiscount = itemTotal - itemDiscount;
      return (amountAfterDiscount * parseFloat(taxPercent)) / 100;
    }
  };

  /**
   * Update Freight total when individual freight charges are changed
   * @param {Number} key
   * @param {String} currency
   * @param {Number} newFreightAmount
   */
  handleFreightAmountChange = (key, currency, newFreightAmount) => {
    if (parseFloat(newFreightAmount) < 0.001) return;

    let freightInfo = this.state.freightInfo.slice();
    if (!newFreightAmount) {
      if (currency === systemCurrency) {
        freightInfo[key].FreightAmount = "";
      }
      //if the currency set the new amount to Foreign Currency Field
      else {
        freightInfo[key].FreightAmountFC = "";
      }
      this.setState({ freightInfo });
    } else {
      let total = 0.0,
        propName,
        totalPaymentDue = 0.0,
        totalPaymentDueFC = 0.0;
      const totalBeforeDiscount = parseFloat(this.state.totalBeforeDiscount);
      const discLocalCurrency = parseFloat(this.state.discLocalCurrency);
      const discForeignCurrency = parseFloat(this.state.discForeignCurrency);
      const totalTax = isNaN(this.state.totalTax) ? 0 : parseFloat(this.state.totalTax);
      //if the currency set the new amount to Local Currency Field
      if (currency === systemCurrency) {
        freightInfo[key].FreightAmount = parseFloat(newFreightAmount);
        propName = "freightTotal";
      }
      //if the currency set the new amount to Foreign Currency Field
      else {
        freightInfo[key].FreightAmountFC = parseFloat(newFreightAmount);
        propName = "freightTotalFC";
      }

      //Update Total Freight Amount
      if (Array.isArray(freightInfo) && freightInfo.length) {
        freightInfo.forEach((freight) => {
          if (currency === systemCurrency) total += parseFloat(freight.FreightAmount);
          else total += parseFloat(freight.FreightAmountFC);
        });
      }

      //Update Total Payment Due amount with updated Freight total
      if (this.state.currency === systemCurrency) {
        totalPaymentDue = totalBeforeDiscount - discLocalCurrency + totalTax + total;
      } else {
        totalPaymentDueFC = totalBeforeDiscount - discForeignCurrency + totalTax + total;
      }

      //update the 'state' prop based on the currency
      this.setState({
        freightInfo,
        [propName]: parseFloat(total).toFixed(3),
        totalPaymentDue,
        totalPaymentDueFC,
      });
    }
  };

  /**
   * Updates Discount Amount based on the new value & call handleDiscountPercentChange()
   * @param {Decimal} discountAmount
   */
  handleDiscountChange = (discountAmount) => {
    //Comenting this out to let user enter NEGATIVE Discounts
    // if(discountAmount < 0) {
    //   return;
    // }
    if (!discountAmount || isNaN(discountAmount)) {
      discountAmount = 0;
    }
    // else {
    let discAmtProp = "discForeignCurrency";
    const { totalBeforeDiscount } = this.state;

    if (totalBeforeDiscount > 0) {
      const discountPercent = (discountAmount / totalBeforeDiscount) * 100;

      //change the state variable names based on the Currency type
      if (this.state.currency === systemCurrency) {
        discAmtProp = "discLocalCurrency";
      }
      this.setState({ [discAmtProp]: round(discountAmount, 4) });
      this.handleDiscountPercentChange(discountPercent);
    }
    // }
  };

  /**
   * Updates the Discount Amount, Total Tax, Total Payment Due based on the new Discount %
   * @param {Number} discountPercent New Discount %
   */
  handleDiscountPercentChange = (discountPercent) => {
    this.setState({ warningMsg: "" });
    if (!discountPercent || isNaN(discountPercent)) {
      //discountPercent < 0 ||  //Comenting this out to let user enter NEGATIVE Discounts
      // this.setState({ discountPercent: 0.0 });
      discountPercent = 0;
    }
    // else {
    let discAmtProp,
      taxAmtProp,
      discountAmount = 0.0,
      taxAmt = 0.0,
      totalTax = 0.0,
      totalPaymentDue = 0.0,
      totalPaymentDueFC = 0.0;
    const { totalBeforeDiscount, freightTotal, freightTotalFC } = this.state;
    let itemsList = this.state.itemsList.slice();
    discountAmount = (parseFloat(totalBeforeDiscount) * discountPercent) / 100;
    //change the state variable names based on the Currency type
    if (this.state.currency === systemCurrency) {
      discAmtProp = "discLocalCurrency";
      taxAmtProp = "TaxLocal";
    } else {
      discAmtProp = "discForeignCurrency";
      taxAmtProp = "TaxForeign";
    }

    //Update 'Tax Amt' for ALL the Items based on the new Discount %
    itemsList.forEach((item) => {
      taxAmt = this.calculateRowLevelTax(
        item.Quantity,
        item.UnitPrice,
        discountPercent,
        item.TaxPercent,
      );
      item[taxAmtProp] = taxAmt;

      //update Tax Total by adding all updated Tax Amt
      totalTax += taxAmt;
    });

    //Update Total Payment Due amount
    if (this.state.currency === systemCurrency) {
      totalPaymentDue = totalBeforeDiscount - discountAmount + totalTax + parseFloat(freightTotal);
    } else {
      totalPaymentDueFC =
        totalBeforeDiscount - discountAmount + totalTax + parseFloat(freightTotalFC);
    }
    console.log(`totalPaymentDue: ${totalPaymentDue} - totalPaymentDueFC: ${totalPaymentDueFC}`);
    this.setState({
      discountPercent: round(discountPercent, 4),
      [discAmtProp]: round(discountAmount, 4), //.toFixed(2)
      itemsList,
      totalTax: totalTax.toFixed(2),
      totalPaymentDue: totalPaymentDue.toFixed(2),
      totalPaymentDueFC: totalPaymentDueFC.toFixed(2),
    });
    // }
  };

  /**
   * Updates quantity for the current Item & updates the Tax Amt, Total Tax, Discount & Tot. Payment Due values
   * NOTE: This method is called on Component Mount as well, bcoz Total Tax, Discount Amount & Payment Due amounts
   * pulled from SAP via queries are not correct at times, so I'm manually updating those values by calling
   * this method by passing '0' as 'key' & the 1st Item's Quantity as 'quantity'
   * @param {Number} key      Current Item's index
   * @param {Number} quantity  New Quantity
   */
  updateQuantity = async (key, quantity) => {
    let totalBeforeDiscount = 0.0,
      totalTax = 0.0;
    const itemsList = cloneDeep(this.state.itemsList);
    // itemsList[key].Quantity = quantity;
    itemsList[key].Quantity = this.isFloat(quantity) ? quantity : parseFloat(quantity);

    const taxAmount = this.calculateRowLevelTax(
      quantity,
      itemsList[key].UnitPrice,
      this.state.discountPercent,
      itemsList[key].TaxPercent,
    );
    //TaxAmt = (Total Amount - Discount) * Tax %
    /*const itemTotal = parseFloat(quantity) * parseFloat(itemsList[key].UnitPrice);
    const itemDiscount = itemTotal * parseFloat(this.state.discountPercent)/100;
    const amountAfterDiscount = itemTotal - itemDiscount;
    const taxAmount = amountAfterDiscount * parseFloat(itemsList[key].TaxPercent)/100;*/

    if (this.state.currency === systemCurrency) itemsList[key].TaxLocal = taxAmount;
    else itemsList[key].TaxForeign = taxAmount;

    itemsList.forEach((item) => {
      totalBeforeDiscount += parseFloat(item.Quantity) * parseFloat(item.UnitPrice);

      //update Total Tax
      if (this.state.currency == systemCurrency) totalTax += parseFloat(item.TaxLocal);
      else totalTax += parseFloat(item.TaxForeign);
    });
    await this.setState({
      itemsList,
      totalBeforeDiscount: isNaN(totalBeforeDiscount)
        ? 0.0
        : parseFloat(totalBeforeDiscount).toFixed(2),
      totalTax: isNaN(totalTax) ? 0.0 : parseFloat(totalTax).toFixed(2),
    });
    /** calling below method from setState's callback funct. didn't update the Discount Amount
     * bcoz the new 'totalBeforeDiscount' was not set in the state at the time of the below method call,
     * so only the old value was getting displayed as 'Discount Amount'
     * adding 'await' before setState and calling the fucnt. in a separate line fixed the issue
     */
    //Update the Discount Amount based on the new Quantity
    this.handleDiscountPercentChange(this.state.discountPercent);
  };

  /** Check if the passed number has decimals */
  isFloat = (num) => {
    return num - Math.floor(num) !== 0;
  };

  /**
   * Check if the Customer Ref# is already used in any other Delivery
   * @param {String} customerRefNo
   */
  validateCustomerRefNo = async (customerRefNo) => {
    console.log("validateCustomerRefNo: " + customerRefNo);
    try {
      let response = await getDelivery({ customerRefNo });
      if (response) {
        this.setState({
          warningMsg: "Customer Refrence no. must be unique. Please enter a different number",
          inValidInput: "is-invalid",
        });
      }
      console.log("validateCustomerRefNo response: " + response);
    } catch (error) {
      this.setState({ warningMsg: error });
    }
  };

  handleCustomerRefNoChange = async (customerRefNo) => {
    this.setState({
      customerRefNo,
      warningMsg: "",
      inValidInput: "",
    });
    if (customerRefNo) {
      await this.validateCustomerRefNo(customerRefNo);
    } else {
      this.setState({
        warningMsg: "Enter a Customer Reference#",
        inValidInput: "is-invalid",
      });
    }
  };

  /**
   * Gets the list of Warehouses/Bin Locations from the resp. APIs and sets them to "state"
   * @param {String} type "Warehouse" or "BinLocation"
   */
  loadDropdownList = async (type, value) => {
    this.setState({ isLoading: true });
    let stateVariable = "";
    let uri, response;
    if (type === "WAREHOUSE") {
      stateVariable = "warehouseList";
      uri = "custom/warehouse";
    } else if (type === "BIN_LOCATION") {
      stateVariable = "binLocationList";
    } else if (type === "Freights") {
      stateVariable = "allFreightList";
      uri = "custom/freights";
    } else if (type === "BRANCH") {
      stateVariable = "branchList";
      uri = "custom/branch";
    }
    try {
      //const response = await axios.get(uri); //added for calling Mock API
      if (type === "WAREHOUSE") {
        response = await api.get(uri, { params: { branchId: value } });
      } else if (type === "BRANCH") {
        response = await api.get(uri, { params: { userId: localStorage.getItem("InternalKey") } });
      } else {
        response = await api.get(uri);
      }
      response = response.data;
      console.log(`Warehouse/Bin List: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        this.setState({
          [stateVariable]: response,
          isLoading: false,
        });
        if (type === "Freights") {
          this.setState({ freightDropdownList: response });
        }
      } else {
        this.setState({ warningMsg: `No ${type} records found`, isLoading: false });
      }
    } catch (error) {
      this.setState({ warningMsg: error, isLoading: false });
    }
  };

  /**
   * Gets Items Details from API based on the selected PO and loads Warehouse & BinLocation dropdown lists.
   * @param {String} selectedBaseRecordNo
   * @param {String} vendorName
   * @param {String} customerCode
   */
  getItemDetails = async () => {
    const { selectedBaseRecordNo } = this.state;
    console.log("getItemDetails -selectedBaseRecordNo: " + selectedBaseRecordNo.toString());
    let itemsList = [],
      freightInfo = [],
      totalBeforeDiscount = 0.0,
      totalTax = 0.0;
    let freightTotal = 0.0,
      freightTotalFC = 0.0;
    var remarks = "Based On Sale Order";
    if (selectedBaseRecordNo.length > 1) {
      remarks += "s " + selectedBaseRecordNo;
    } else {
      remarks += " " + selectedBaseRecordNo;
    }

    if (selectedBaseRecordNo.length > 0) {
      this.setState({ isLoading: true });
      try {
        const response = await getSaleOrderItems(selectedBaseRecordNo);
        // const response = await api.get(`custom/sale-order/items`, {params: {docNum: selectedBaseRecordNo} }); //req.query
        //const response = await api.get(`itemdetails/${selectedBaseRecordNo}`); //req.param
        if (response) {
          freightInfo = response.freightInfo;
          console.log(`freightInfo: ${JSON.stringify(freightInfo)}`);

          //Calculate Total Freight Amount to display in the popover
          if (Array.isArray(freightInfo) && freightInfo.length) {
            freightInfo.forEach((freight) => {
              freightTotal += parseFloat(freight.FreightAmount);
              freightTotalFC += parseFloat(freight.FreightAmountFC);
            });
          }
          itemsList = response.itemsList;
          console.log(`Items List Before: ${JSON.stringify(itemsList)}`);
          if (Array.isArray(itemsList) && itemsList.length) {
            //load Bin Location list to the dropdown
            //await this.loadDropdownList("BinLocation");

            //console.log("itemsList: "+JSON.stringify(itemsList));

            itemsList.forEach(async (item) => {
              //load the Bin Locations for the current WH for each item/row
              //TODO: This DIDN'T work. Bcoz fo this code LocCode & Loc Name are not set
              // item.binLocationList = await this.getBinsAndItemQtyForWarehouse("BINS", item.WhsCode);

              //Set Bin Location for each Item based on the "selected" Warehouse of the Item
              this.state.warehouseList.forEach((warehouse) => {
                //console.log(`warehouse.WhsCode: ${warehouse.WhsCode} | item.WhsCode: ${item.WhsCode} | item.BinCode: ${item.BinCode}`);
                if (item.WhsCode === warehouse.WhsCode) {
                  //setting only the BinCode without settnig BinAbsEntry will result in error, so commented it out
                  //item.BinCode = warehouse.BinCode;
                  item.LocationCode = warehouse.LocationCode;
                  item.LocationName = warehouse.LocationName;
                }
              });
              /* Commenting these calculations, as updateQuantity() that is called below will take care of it

              //Calculate 'Total Before Discount' amount
              totalBeforeDiscount += parseFloat(item.Quantity) * parseFloat(item.UnitPrice)

              //Calculate Total Tax
              if(this.state.currency == systemCurrency)
                totalTax += parseFloat(item.TaxLocal);
              else
                totalTax += parseFloat(item.TaxForeign);
              */
            });
          }
          //console.log(`Items List After: ${JSON.stringify(itemsList)}`);
        }
      } catch (error) {
        this.setState({
          warningMsg: error.response ? error.response.data.message : JSON.stringify(error),
        });
      } finally {
        await this.setState({
          itemsList,
          freightInfo,
          freightTotal: parseFloat(freightTotal).toFixed(2),
          freightTotalFC: parseFloat(freightTotalFC).toFixed(2),
          remarks,
          postingDate: this.state.serverDateTime,
          isLoading: false,
          totalBeforeDiscount: isNaN(totalBeforeDiscount)
            ? 0.0
            : parseFloat(totalBeforeDiscount).toFixed(2),
          totalTax: isNaN(totalTax) ? 0.0 : parseFloat(totalTax).toFixed(2),
        });
        if (Array.isArray(itemsList) && itemsList.length) {
          //to trigger an update
          this.updateQuantity(0, itemsList[0].Quantity ? itemsList[0].Quantity : 0);
        }
      }
    }
  };

  /**
   * Removes the selected Item from the Items List (in React 'state') before submitting a GRPO.
   * @param {Number} lineNum Line Number of the Item that needs to be removed
   */
  removeItem = async (docEntry, lineNum, key) => {
    const { itemsList } = this.state;
    /** Hide the Tooltip before performing the Delete operation or if you remove a row that shows a tooltip
     * the tooltip doesn't hide even after deleting the item, & it will show on top of the current item
     * though it has a valid Quantity
     */
    //Get the array of rows with Invalid nos. from 'state' & set the current row's value as 'false'
    let quantityTooltip = []; //this.state.quantityTooltip;
    quantityTooltip[key] = false;
    this.setState({ quantityTooltip });
    //Remove the item ONLY when the Items table has more than '1' item
    if (itemsList.length > 1) {
      //Filter out the item with the selected 'lineNum' from the itemsList & set the new array back to the 'state'
      let filteredItemList = itemsList.filter((item) => {
        return !(item.DocEntry === docEntry && item.LineNum === lineNum);
      });
      await this.setState({ itemsList: filteredItemList });
      this.updateQuantity(0, filteredItemList[0].Quantity ? filteredItemList[0].Quantity : 0);
    } else {
      this.setState({ showLastItemRemovalWarning: true });
      //Clear the warning msg after 6 secs.
      setTimeout(() => this.setState({ showLastItemRemovalWarning: false }), 6000);
    }
  };

  componentDidUpdate(prevProps, prevState) {
    console.log("componentDidUpdate: ");
    let selectedBaseRecordNo = []; //poDocEntry = [],
    const { selectedBaseRecords } = this.props;
    if (
      Array.isArray(selectedBaseRecords) &&
      selectedBaseRecords.length > 0 &&
      selectedBaseRecords != this.state.selectedBaseRecords
    ) {
      selectedBaseRecords.forEach((rec) => {
        // poDocEntry.push(rec.DocEntry);
        selectedBaseRecordNo.push(rec.DocNum);
      });
      this.setState({ selectedBaseRecords, selectedBaseRecordNo });
    }
  }

  /**
   * Gets Date/Time from the server.
   *
   * NOTE: Normally, users are blocked from selecting future dates as 'Posting Date'.
   * Currently, this restriction is done using 'local' system date, but if a user
   * changes his/her system date to a future date, the system will let them choose a future date
   * as 'Posting Date'. Getting the date from the 'server' and using it to fix this issue.
   */
  getServerDateTime = async () => {
    let serverDateTime = ReactDatetime.moment(new Date());
    try {
      const response = await api.get("custom/server-date");
      // console.log("serverDateTime - response: "+ JSON.stringify(response));
      serverDateTime = ReactDatetime.moment(response.data.serverDateTime);
      console.log("serverDateTime: " + serverDateTime);
      console.log("today: " + this.today);
    } catch (err) {
      console.log("Unable to get Server time");
    } finally {
      this.setState({ serverDateTime });
    }
  };

  setValuesToState = async () => {
    if (this.props.selectedBaseRecords) {
      let selectedBaseRecordNo = [];
      this.props.selectedBaseRecords.forEach((rec) => {
        // poDocEntry.push(rec.DocEntry);
        selectedBaseRecordNo.push(rec.DocNum);
      });

      this.setState({
        selectedBaseRecords: this.props.selectedBaseRecords,
        selectedBaseRecordNo,
        vendorName: this.props.selectedBaseRecords
          ? this.props.selectedBaseRecords[0].CardName
          : "NA",
        customerCode: this.props.selectedBaseRecords
          ? this.props.selectedBaseRecords[0].CardCode
          : "NA",
        exchangeRate: this.props.selectedBaseRecords
          ? this.props.selectedBaseRecords[0].DocRate
          : "NA",
        currency: this.props.selectedBaseRecords ? this.props.selectedBaseRecords[0].DocCur : "NA",
        discountPercent: this.props.selectedBaseRecords
          ? parseFloat(this.props.selectedBaseRecords[0].DiscountPercent).toFixed(3)
          : 0,
        discLocalCurrency: this.props.selectedBaseRecords
          ? this.props.selectedBaseRecords[0].TotalDiscount
          : 0,
        discForeignCurrency: this.props.selectedBaseRecords
          ? this.props.selectedBaseRecords[0].TotalDiscountFC
          : 0,
        totalPaymentDue: this.props.selectedBaseRecords
          ? this.props.selectedBaseRecords[0].DocTotal
          : 0,
        totalPaymentDueFC: this.props.selectedBaseRecords
          ? this.props.selectedBaseRecords[0].DocTotalFC
          : 0,
        // branchId: this.props.selectedBaseRecords ? this.props.selectedBaseRecords[0].BPLId : 0
        branchId: isMultiBranchEnabled
          ? this.props.selectedBaseRecords
            ? this.props.selectedBaseRecords[0].BPLId
            : 0
          : 1, //Set default branch when multi-branch is not set
      });
    }
  };

  async componentDidMount() {
    console.log("ItemDetails - componentDidMount");
    // const { selectedBaseRecordNo, vendorName, customerCode } = this.state;
    // console.log(`ItemDetails- selectedBaseRecordNo: ${selectedBaseRecordNo} | vendorName: ${vendorName} | customerCode: ${customerCode}`);
    // this.setState ({ selectedBaseRecordNo, vendorName, customerCode });
    await this.getServerDateTime();
    //load Warehouse list to the dropdown
    // await this.loadDropdownList("WAREHOUSE");
    if (this.props.selectedBaseRecords && this.props.selectedBaseRecords[0].BPLId)
      await this.loadDropdownList("WAREHOUSE", this.props.selectedBaseRecords[0].BPLId);
    // await this.loadDropdownList("BRANCH");
    await this.setValuesToState();
    await this.getItemDetails();

    //load Bin Location list to the dropdown
    await this.loadDropdownList("Freights");
  }

  render() {
    const { selectedBaseRecordNo, vendorName, customerCode, currency } = this.state;

    const itemsTableHead = [
      "",
      "Item Number",
      "Item Description",
      "Qty",
      "Price",
      "Tax %",
      "Tax Amt",
      "Warehouse",
      "Warehouse Loc.",
      "UOM",
    ]; //"Bin Loc.",

    let isMultipleBaseRecsSelected = false;
    if (selectedBaseRecordNo.length > 1) {
      isMultipleBaseRecsSelected = true;
      itemsTableHead.splice(1, 0, "PO No.");
    }

    //returns a value with 2 decimals
    //const exchangeRate = Math.round((parseFloat(this.state.exchangeRate) + Number.EPSILON) * 100) / 100;

    //returns a value with 2 decimals
    const exchangeRate = parseFloat(this.state.exchangeRate).toFixed(3);

    // let discountAmount = currency === systemCurrency ? this.state.discLocalCurrency
    //                       : this.state.discForeignCurrency
    // discountAmount = parseFloat(discountAmount).toFixed(4)

    let freightTotal =
      currency === systemCurrency ? this.state.freightTotal : this.state.freightTotalFC;
    if (this.isFloat(freightTotal)) {
      freightTotal = Math.round(freightTotal * 1000) / 1000;
    }

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
                  <Col md="3">
                    <h3 className="mb-0">Create Delivery</h3>
                  </Col>
                  <Col className="text-right" md="6">
                    {this.state.isLoading ? (
                      <>
                        <i className="fa fa-info-circle text-blue" /> &nbsp;
                        <small className="my-2 text-primary">Processing... &emsp;</small>
                        <Spinner color="primary" className="reload-spinner" />
                      </>
                    ) : this.state.successMsg ? (
                      <ToastMessage type={statusColors.SUCCESS} message={this.state.successMsg} />
                    ) : this.state.warningMsg ? (
                      <ToastMessage type={statusColors.WARNING} message={this.state.warningMsg} />
                    ) : null}
                  </Col>
                  <Col>
                    {!this.state.isLoading &&
                      (this.state.docNum || this.state.draftNum) &&
                      Array.isArray(this.state.batchSerialsList) &&
                      this.state.batchSerialsList.length > 0 && (
                        <PreviewPrintQRCodes
                          // className="mt-2 pt-1 ml-2"
                          batchSerialsList={this.state.batchSerialsList}
                          batchNumberProperty={itemTypeProperties.BATCH_NUMBER_OLD}
                          internalSerialNumber={itemTypeProperties.SERIAL_NUMBER}
                          quantity="Quantity"
                          showPrintOptions={true}
                        />
                      )}
                    {!this.state.isLoading && this.state.operation !== displayModes.VIEW && (
                      <>
                        <Button
                          color="primary"
                          className="ml-2"
                          onClick={this.processRequest}
                          size="sm"
                        >
                          Submit
                        </Button>
                        &nbsp;
                        <Button
                          color="danger"
                          onClick={(e) => this.props.toggleTabs(e, "grpoTab", 1)}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="mt--2">
                <h6 className="heading-small text-muted mb-3">Sale Order Details</h6>
                {/** <div className="pl-lg-3 pr-lg-3 mt--1 mb-2"> */}
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
                  {" "}
                  {/** text-center */}
                  <Row>
                    <Col sm="6" md="3">
                      <small className="text-muted">Sale Order#</small>
                      <h4 className="mt-1">{selectedBaseRecordNo.toString()}</h4>
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Customer Reference#</small>
                      <FormGroup className="mt-1">
                        <DebouncedInput
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          style={{ width: 80 + "%" }}
                          className={
                            "form-control display-4 text-gray-dark " + this.state.inValidInput
                          }
                          id="input-customer-ref-no"
                          placeholder="Enter Customer Ref#"
                          onChange={this.handleCustomerRefNoChange}
                          delayInMilliseconds={700}
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="2">
                      <small className="text-muted">Customer Code </small>
                      <h4 className="mt-1">{customerCode}</h4>
                    </Col>
                    <Col sm="6" md="4">
                      <small className="text-muted">Customer Name</small>
                      <h4 className="mt-1">{vendorName}</h4>
                    </Col>
                  </Row>
                  <Row className="mt--2">
                    <Col sm="6" md="3">
                      <small className="text-muted">Posting Date</small>
                      <FormGroup className="mt-1">
                        <InputGroup>
                          <i className="ni ni-calendar-grid-58 mt-1" />
                          <ReactDatetime
                            inputProps={{
                              className: "text-gray-dark mr-3 ml-2 mt--5 border-0",
                              readOnly: true,
                            }}
                            value={this.state.postingDate}
                            onChange={(momentObj) => this.handleDateChange(momentObj)}
                            isValidDate={this.disableFutureDates}
                            timeFormat={false}
                            dateFormat={"MMMM D, YYYY"}
                            closeOnSelect={true}
                          />
                        </InputGroup>
                      </FormGroup>
                      {/*<h4 className="mt-1">{formatDate(today, "MMMM D, YYYY")}</h4>*/}
                    </Col>
                    <Col sm="6" md="3">
                      <small className="text-muted">Currency</small>
                      <h4 className="mt-1">{currency}</h4>
                    </Col>
                    <Col sm="6" md="2">
                      <small className="text-muted">Exchange Rate</small>
                      <h4 className="mt-1">{exchangeRate}</h4>
                    </Col>
                    <Col sm="6" md="4">
                      <small className="text-muted">Remarks</small>
                      <FormGroup className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          rows="2"
                          type="textarea"
                          value={this.state.remarks}
                          className="form-control display-4 text-gray-dark"
                          id="input-customer-remarks"
                          placeholder="Enter Remarks"
                          onChange={(e) => this.setState({ remarks: e.target.value })}
                        />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <small className="text-muted">Warehouse</small>
                      <div className="mt-1 mb-3">
                        <Popover
                          placement="top"
                          target={`warehouse`}
                          className="popover-warning"
                          isOpen={this.state.warehousePopover}
                        >
                          <PopoverBody className="text-center">
                            <p className="text-gray-dark text-xs text-center mb-2 font-weight-600">
                              Selected Warehouse will be applied to all the below items. Are you
                              sure you want to continue?
                            </p>
                            <Button
                              outline
                              color="primary"
                              onClick={(event) =>
                                this.handleWarehouseChange("warehouse", this.state.warehouse, true)
                              }
                              size="sm"
                            >
                              Yes
                            </Button>
                            <Button
                              outline
                              color="danger"
                              onClick={() => this.togglePopover("warehousePopover")}
                              size="sm"
                            >
                              No
                            </Button>
                          </PopoverBody>
                        </Popover>
                        <Input
                          bsSize="sm"
                          id="warehouse"
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
                  </Row>
                </Card>
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
                  <Row className="mt--1">
                    <Col sm="6" md="2">
                      <small className="text-muted">Total Before Discount</small>
                      <h4 className="mt-1">
                        {currency} {this.state.totalBeforeDiscount}
                      </h4>
                    </Col>
                    <Col sm="6" md="2">
                      <small className="text-muted">Discount %</small>
                      <FormGroup className="mt-1">
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          style={{ width: 65 + "%" }}
                          value={this.state.discountPercent}
                          /** NOTE: Added "display-4 text-gray-dark" to change the size and color of the Textbox font */
                          className={"form-control display-4 text-gray-dark "}
                          id="input-disc-perc"
                          placeholder=""
                          type="number"
                          onChange={(e) => this.handleDiscountPercentChange(e.target.value)}
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="2">
                      <small className="text-muted">Discount Amount</small>
                      {/* <h4 className="mt-1">{currency} {discountAmount}</h4> */}
                      <FormGroup className="mt-1">
                        {/* <h4>{currency}</h4> */}
                        <Input
                          bsSize="sm"
                          readOnly={this.state.displayMode === displayModes.VIEW}
                          style={{ width: 70 + "%" }}
                          value={
                            currency === systemCurrency
                              ? this.state.discLocalCurrency
                              : this.state.discForeignCurrency
                          }
                          /** NOTE: Added "display-4 text-gray-dark" to change the size and color of the Textbox font */
                          className={"form-control display-4 text-gray-dark "}
                          id="input-disc"
                          placeholder=""
                          type="number"
                          onChange={(e) => this.handleDiscountChange(e.target.value)}
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6" md="2">
                      <small className="text-muted">Total Tax</small>
                      <h4 className="mt-1">
                        {currency} {this.state.totalTax}
                      </h4>
                    </Col>
                    <Col sm="6" md="2">
                      <small className="text-muted">Freight</small>
                      <FormGroup className="mt-0">
                        <InputGroup>
                          <h4 className="mt-1">
                            {currency} &nbsp;
                            {currency === systemCurrency
                              ? this.state.freightTotal
                              : this.state.freightTotalFC}
                          </h4>
                          <span
                            id="freightPopOverBtn"
                            className="text-warning ml-2 mt-1"
                            style={{ cursor: "pointer" }}
                          >
                            <i className="ni ni-delivery-fast" />
                          </span>
                        </InputGroup>
                      </FormGroup>
                      <Popover
                        placement="top"
                        isOpen={this.state.freightPopOver}
                        target="freightPopOverBtn"
                        style={{ width: "400px" }}
                        toggle={() => this.toggleComponent("freightPopOver")}
                      >
                        <h4 className="ml-3 mt-2">Freight Charges</h4>
                        <span style={{ position: "fixed", top: 7, right: 12 }}>
                          {/** Display Add button only when there are more than 1 freight in the dropdown */}
                          {this.state.freightDropdownList.length > 1 && (
                            <PlusSquare
                              size={23}
                              className="text-primary cursor-pointer"
                              onClick={this.handleAddFreight}
                            />
                          )}
                          <X
                            size={18}
                            className="text-danger ml-2"
                            style={{ cursor: "pointer" }}
                            onClick={() => this.toggleComponent("freightPopOver")}
                          />
                        </span>
                        <PopoverBody>
                          <Table
                            size="sm"
                            // className="ml--3 mt--1 mb--2 table-sm">
                            className="ml-0 mt--2 mb-0 mr--1 table-sm"
                          >
                            <thead style={{ backgroundColor: "#8e7ef324" }}>
                              <tr>
                                <th scope="col">#</th>
                                <th scope="col">PO#</th>
                                {/* <th scope="col">Code</th> */}
                                <th scope="col">Freight Name</th>
                                <th scope="col">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(this.state.freightInfo) &&
                              this.state.freightInfo.length > 0 ? (
                                this.state.freightInfo.map((item, key) => {
                                  return (
                                    <tr key={item.FreightCode} id={"frId" + key}>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <span
                                          id={"fr-" + key}
                                          className="btn-inner--icon cursor-pointer"
                                          // style={{cursor: "pointer"}}
                                          onClick={() => this.handleDeleteFreight(key)}
                                        >
                                          <i className="fa fa-trash text-red" />
                                        </span>
                                        {/* <Trash2
                                        id={`fr_${item.FreightCode}`}
                                        size={18}
                                        className="mr-1 pb-1 text-danger"
                                        onClick={() => this.handleDeleteFreight(key)}
                                      /> */}
                                        {/* {key+1} */}
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        {item.DocNum ? item.DocNum : "..."}
                                      </td>

                                      {/* <td>{item.FreightCode}</td> */}
                                      <td style={{ verticalAlign: "middle" }}>
                                        {/** Display Freight Name for Freight recs. tthat are carryfwded
                                         * from PO. Display dropdown only for newly added Freight recs. */}
                                        {!item.isNew ? (
                                          item.FreightName
                                        ) : (
                                          <Input
                                            bsSize="sm"
                                            type="select"
                                            name="select"
                                            readOnly={this.state.displayMode === displayModes.VIEW}
                                            value={item.FreightCode}
                                            style={{ width: "auto" }} //auto
                                            onChange={(event) =>
                                              this.handleFreightChange(key, event.target.value)
                                            }
                                          >
                                            {/* <option value="">Select a Freight</option> */}
                                            {this.state.freightDropdownList.map((freight, key) => {
                                              // this.state.allFreightList.map((freight, key) => {
                                              return (
                                                <option
                                                  key={freight.FreightCode + freight.FreightName}
                                                  value={freight.FreightCode}
                                                >
                                                  {freight.FreightName}
                                                </option>
                                              );
                                            })}
                                          </Input>
                                        )}
                                      </td>
                                      <td>
                                        <Input
                                          bsSize="sm"
                                          readOnly={this.state.displayMode === displayModes.VIEW}
                                          style={{ width: 80 + "%" }}
                                          value={
                                            currency === systemCurrency
                                              ? item.FreightAmount
                                              : item.FreightAmountFC
                                            /* ? parseFloat(item.FreightAmount).toFixed(3)
                                          : parseFloat(item.FreightAmountFC).toFixed(3)
                                          */
                                          }
                                          className={"form-control display-4 text-gray-dark"}
                                          id="input-freight-amt"
                                          placeholder=""
                                          type="number"
                                          onChange={(e) =>
                                            this.handleFreightAmountChange(
                                              key,
                                              currency,
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan="4" className="text-blue">
                                    <i className="fa fa-info-circle" /> &nbsp; No Freight records
                                    available. Click
                                    <span className="btn-inner--icon">
                                      <i className="ni ni-fat-add text-primary" />
                                    </span>{" "}
                                    to add.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                {/* <td style={{textAlign:"right"}} colSpan="2"><h4>Total</h4></td> */}
                                <td></td>
                                <td></td>
                                <td>
                                  <h4>Freight Total</h4>
                                </td>
                                <td>
                                  <h4>
                                    {" "}
                                    {freightTotal}
                                    {/* {currency === systemCurrency ? this.state.freightTotal
                                  : this.state.freightTotalFC} */}
                                  </h4>
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </PopoverBody>
                      </Popover>
                    </Col>
                    <Col sm="6" md="2">
                      <small className="text-muted">Total Payment Due</small>
                      <h4 className="mt-1">
                        {currency}{" "}
                        {currency === systemCurrency
                          ? parseFloat(this.state.totalPaymentDue).toFixed(2)
                          : parseFloat(this.state.totalPaymentDueFC).toFixed(2)}
                      </h4>
                    </Col>
                  </Row>
                </Card>
                {/** <hr className="my-2" /> */}
                {this.state.operation === displayModes.CREATE && (
                  <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
                    <Col md="4">
                      <ScanAndSearchBatchSerialItems
                        // isAllAreNormalItems={this.state.isAllAreNormalItems}
                        itemsList={this.state.itemsList}
                        addScannedBatchSerialItemToRow={this.handleItemScan}
                        handleDeleteBatchSerial={this.handleDeleteBatchSerial}
                        userRole={this.props.userRole}
                        operation={this.state.operation}
                        showOldItemsModal={true}
                        isBinCodeRequired={false}
                        // binCode={this.state.binCode}
                      />
                    </Col>
                  </Card>
                )}
                {/* Item Details */}
                <ItemsTable
                  operation={displayModes.CREATE}
                  itemsList={this.state.itemsList}
                  warehouseList={this.state.warehouseList}
                  getWarehouseName={this.getWarehouseName}
                  handleQuantityChange={this.handleQuantityChange}
                  handleDeleteBatchSerial={this.handleDeleteBatchSerial}
                  updateItemsList={this.updateItemsList}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </>
    );
  }
}
export default ItemDetails;
