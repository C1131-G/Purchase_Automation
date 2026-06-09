import React from "react";
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
  Tooltip,
} from "reactstrap";
import { Trash2, X, PlusSquare } from "react-feather";

import ToastMessage from "../../../../components/ToastMessage";
import CustomModal from "../../../../components/CustomModal.js";
import BatchSerialsSelectionModal from "../../BatchSerialsSelectionModal.js";
import BatchSerialsSelectionCard from "../../BatchSerialsSelectionCard.js";

import { showWarningMsg, isFloat, round } from "../../../../config/util.js";
import { portalModules, displayModes, itemTypes, itemRequestType } from "../../../../config/config";
import { getBatchSerialInfo, getItemType } from "../../../../helper/items-helper";
import moment from "moment";

const PRECISION = 2;

export default class BatchSerialItemsModal extends React.PureComponent {
  state = {
    itemsList: [],
    isOpen: false,
    selectedItemKey: -1,
    deletedBatchSerialRec: null,
    clickedItems: [],
    itemRowEffect: [],
    binAllocationPopOver: [],
    binAllocationWarningMsg: "",
    popupWarningMsg: "",
    popupQuantityTooltip: [],
  };

  /** Closes the popup and clears certain data from "state" variables when Cancel button is clicked from the popup */
  cancelPopup = () => {
    if (this.props.closeModal) {
      this.props.closeModal();
    }
    this.setState({
      //Commented to retain values in popup window when "Cancel" btn is clicked in teh popup
      /** createdBatchList: [],
       createdSerialNoList: [],
       filteredBatchList: [],
       filteredSerialNoList: [],
       clickedItems: [],
       itemRowEffect: []
      */
      popupWarningMsg: "",
      popupInvalidItemQuantity: false,
    });
  };

  toggleBinAllocationPopover = (batchSerialKey) => {
    //itemKey,
    this.setState({ binAllocationWarningMsg: "", warningMsg: "", successMsg: "" });
    let binAllocationPopOver = [];
    if (batchSerialKey > -1) {
      binAllocationPopOver = [...this.state.binAllocationPopOver];
      /* NOT Required now. I will try this when the existing logic didnt work!
      
      if(Array.isArray(binAllocationPopOver) && binAllocationPopOver.length > 0) {
        if(binAllocationPopOver[itemKey] && Array.isArray(binAllocationPopOver[itemKey])) {
          // if(binAllocationPopOver[itemKey][batchSerialKey]) {

          // }
          binAllocationPopOver[itemKey][batchSerialKey] = binAllocationPopOver[itemKey][batchSerialKey] ? false : true;
        }
        else {
          let batchSerialPopOver = [];
          batchSerialPopOver[batchSerialKey] = true;
          binAllocationPopOver.splice(itemKey, 0, batchSerialPopOver); //Add an array within an array
        }
      }*/
      binAllocationPopOver[batchSerialKey] = binAllocationPopOver[batchSerialKey] ? false : true;
    } else {
      //Close all popups when the key is -1
      // binAllocationPopOver = []; //This is taken care in the value 'assignment' part
    }
    console.log("binAllocationPopOver: " + JSON.stringify(binAllocationPopOver));
    this.setState({ binAllocationPopOver, popupWarningMsg: "" });
  };

  /**
   * Auto clears warning & success msgs that are displayed in Toast
   * @param {String} name  Name of the 'state' varable, 'warningMsg' or 'successMsg'
   */
  clearToastMessage = (name) => {
    setTimeout(() => this.setState({ [name]: "" }), 4000);
  };
  /**
   * Removes the data from the state. To be called from the child comp. after using the
   * `deletedBatchSerialRec` prop
   */
  resetDeletedBatchSerialRec = () => {
    console.log("resetDeletedBatchSerialRec");
    this.setState({ deletedBatchSerialRec: null });
  };

  /**
   *
   * @param {*} batchSerialKey
   */
  handleDeleteBatchSerial = (batchSerialKey) => {
    let itemsList = cloneDeep(this.state.itemsList);
    const { selectedItemKey } = this.state;
    let deletedRecNum = "";
    let deletedBatchSerialRec = {
      WhsCode: itemsList[selectedItemKey].WhsCode,
      ItemCode: itemsList[selectedItemKey].ItemCode,
    };

    //Close the Bin Allocation Popover if it is open
    if (this.state.binAllocationPopOver[batchSerialKey]) {
      this.toggleBinAllocationPopover(batchSerialKey);
    }

    if (
      itemsList[selectedItemKey].BatchNumbers &&
      Array.isArray(itemsList[selectedItemKey].BatchNumbers) &&
      itemsList[selectedItemKey].BatchNumbers.length > 0
    ) {
      deletedRecNum = itemsList[selectedItemKey].BatchNumbers[batchSerialKey].BatchNumber;
      deletedBatchSerialRec = {
        ...deletedBatchSerialRec,
        BatchNumber: deletedRecNum,
        // get the BinAbsEntry from the 1st BinLocation
        BinAbsEntry:
          itemsList[selectedItemKey].BatchNumbers[batchSerialKey].DocumentLinesBinAllocations[0]
            .BinAbsEntry,
      };

      itemsList[selectedItemKey].BatchNumbers.splice(batchSerialKey, 1);
    } else if (
      itemsList[selectedItemKey].SerialNumbers &&
      Array.isArray(itemsList[selectedItemKey].SerialNumbers) &&
      itemsList[selectedItemKey].SerialNumbers.length > 0
    ) {
      deletedRecNum = itemsList[selectedItemKey].SerialNumbers[batchSerialKey].InternalSerialNumber;
      deletedBatchSerialRec = {
        ...deletedBatchSerialRec,
        InternalSerialNumber: deletedRecNum,
        BinAbsEntry:
          itemsList[selectedItemKey].SerialNumbers[batchSerialKey].DocumentLinesBinAllocations[0]
            .BinAbsEntry,
      };

      itemsList[selectedItemKey].SerialNumbers.splice(batchSerialKey, 1);
    }
    console.log("deletedBatchSerialRec: ", deletedBatchSerialRec);
    this.setState({
      itemsList,
      deletedBatchSerialRec,
      successMsg: `Batch/Serial no. ${deletedRecNum} has been removed!`,
    });
    this.clearToastMessage("successMsg");
  };

  /**
   * Removes the selected Bin from Batch/Serial list
   * @param {*} batchSerialKey
   * @param {*} binKey
   */
  handleDeleteBinAllocation = (batchSerialKey, binKey) => {
    this.setState({ warningMsg: "" });
    const { selectedItemKey } = this.state;
    let itemsList = cloneDeep(this.state.itemsList);

    if (
      itemsList[selectedItemKey].BatchNumbers &&
      Array.isArray(itemsList[selectedItemKey].BatchNumbers) &&
      itemsList[selectedItemKey].BatchNumbers.length > 0
    ) {
      itemsList[selectedItemKey].BatchNumbers[batchSerialKey].DocumentLinesBinAllocations.splice(
        binKey,
        1,
      );
    } else if (
      itemsList[selectedItemKey].SerialNumbers &&
      Array.isArray(itemsList[selectedItemKey].SerialNumbers) &&
      itemsList[selectedItemKey].SerialNumbers.length > 0
    ) {
      itemsList[selectedItemKey].SerialNumbers[batchSerialKey].DocumentLinesBinAllocations.splice(
        binKey,
        1,
      );
    }

    this.setState({
      itemsList,
      successMsg: "Selected Bin Allocation has been removed!",
    });
  };

  /**
   * Adds the Scanned/User Entered (in case of items W QR Code) or Selected items (in case of 'old'
   * Items that don't have QR Code) to appropriate 'rows' in the Transfer table
   *
   * To be called from <ScanAndSearchBatchSerialItems>
   *
   * @param {*} scannedBatchSerialRec  Batch or Serial rec.
   */
  handleScan = (scannedBatchSerialRec) => {
    let selectedItem = this.state.itemsList[this.state.selectedItemKey];
    console.log("handleScan - scannedBatchSerialRec: " + JSON.stringify(scannedBatchSerialRec));
    console.log("handleScan - selectedItem: " + JSON.stringify(selectedItem));

    //Check if the scanned Item belongs to teh same WH as that of the current 'row'
    if (scannedBatchSerialRec.WhsCode === selectedItem.WhsCode) {
      //Check if the Scanned Batch/Serial rec. belongs to the same WH Location as that of the selected 'ror'
      // if(scannedBatchSerialRec.LocationName === this.props.warehouseLocation) {

      // Compare the Scanned recs. Location with storeLocation when the selectedItem doesn't have the Location info.
      if (
        scannedBatchSerialRec.LocationName === selectedItem.LocationName ||
        (!selectedItem.LocationName &&
          scannedBatchSerialRec.LocationName === this.props.storeLocation)
      ) {
        //Add the scanned item to the STrans if the scanned item's ItemCode & WhsCode matches
        //one of the items in the STrans Req.'s ItemCode & WhsCode
        if (Array.isArray(this.state.itemsList) && this.state.itemsList.length) {
          const isSerialItem = scannedBatchSerialRec.InternalSerialNumber ? true : false;

          let itemsList = cloneDeep(this.state.itemsList);
          let scannedItem = {},
            isTheScannedItemAdded = false,
            isTheScannedItemValid = false;
          let isTheScannedBinAdded = false;
          let batchList = [],
            serialList = [];
          let itemKey, batchSerialKey;
          //loop through all the items and add teh scanned Item's Qty & Batch/Serial No. details to the
          //matching Item
          for (let i = 0; i < itemsList.length; i++) {
            // if(isTheScannedItemValid)
            //   break;
            scannedItem = {};
            isTheScannedItemAdded = false;
            batchList = [];
            serialList = [];

            if (
              itemsList[i].ItemCode === scannedBatchSerialRec.ItemCode
              //TODO: Need to uncommet this
              //Comenting this out for Testing purpose as FromWarehouse was coming a NULL, so recs. matched
              //when entering Batch#
              // && itemsList[i].FromWarehouse === scannedBatchSerialRec.WhsCode
            ) {
              isTheScannedItemValid = true;

              //Add the scanned Item's WH Code as Item's WH Code
              //TODO: Need to restrict uses from scanning an item from diff. WH other than the 'Requested WH'
              itemsList[i].WhsCode = scannedBatchSerialRec.WhsCode;

              //either AddedQuanity must be NaN. (it will be undefined initially)
              //or 0 (it will be "0" when "1" Item is added & removed)
              //or it must be less than the Requested Quantity (Anish said Quantity can be more than teh
              //req. Qty so I'm not checking that cond.)
              console.log("itemsList[i].AddedQuantity: |" + itemsList[i].AddedQuantity + "|");

              const total = this.getBinAllocationTotalInAllBatchSerials(itemsList[i]);
              if (
                isNaN(total) ||
                parseFloat(total) == 0 ||
                parseFloat(total) < parseFloat(itemsList[i].Quantity)
              ) {
                // response.data[0].forEach(batchSerial => {
                console.log("itemsList[i].ItemCode: " + itemsList[i].ItemCode);
                console.log("itemsList[i].FromWarehouse: " + itemsList[i].FromWarehouse);
                console.log("scannedBatchSerialRec: " + JSON.stringify(scannedBatchSerialRec));
                // if(itemsList[i].ItemCode === scannedBatchSerialRec.ItemCode
                //   && itemsList[i].FromWarehouse === scannedBatchSerialRec.WhsCode) {
                scannedItem = {
                  BatchNumber: scannedBatchSerialRec.BatchNumber
                    ? scannedBatchSerialRec.BatchNumber
                    : scannedBatchSerialRec.BatchNumberProperty
                      ? scannedBatchSerialRec.BatchNumberProperty
                      : "",
                  InternalSerialNumber: isSerialItem
                    ? scannedBatchSerialRec.InternalSerialNumber
                    : "",
                  // Auto-set the `OnHandQty` (which will be `1`) for `Serial Items` directly to the `Quantity` prop.
                  // Only for Batch Items user must enter the Qty manually
                  Quantity: isSerialItem ? parseFloat(scannedBatchSerialRec.OnHandQty) : "",
                  /** NOTE: below prop will be used for comparison in handleQuantityChange()
                   * method when user tries to change the scanned Qty.
                   * This will not be added in teh payload*/
                  AvailableQuantity: parseFloat(scannedBatchSerialRec.OnHandQty),

                  DocumentLinesBinAllocations: [
                    {
                      BinCode: scannedBatchSerialRec.BinCode,
                      BinAbsEntry: scannedBatchSerialRec.BinAbsEntry,
                      OnHandQty: parseFloat(scannedBatchSerialRec.OnHandQty),
                      Quantity: isSerialItem ? parseFloat(scannedBatchSerialRec.OnHandQty) : "",
                    },
                  ],
                };

                console.log("scannedItem: " + JSON.stringify(scannedItem));
                //If the scanned item is a Batch item
                // if(scannedItem.BatchNumber) { // This passes even if `BatchNumber` is blank! DAMN!!
                if (itemsList[i].ManBtchNum === "Y") {
                  console.log(
                    "itemsList[i].ItemCode - itemsList[i].ManBtchNum: ",
                    itemsList[i].ItemCode,
                    " - ",
                    itemsList[i].ManBtchNum,
                  );
                  //'length' must be > than '0' bcoz if the last Batch under an Item is deleted then
                  //this array will bcome empty [], not undefined (ELSE part will be executed only
                  //if is UNDEFINED, not [])
                  if (
                    Array.isArray(itemsList[i].BatchNumbers) &&
                    itemsList[i].BatchNumbers.length
                  ) {
                    batchList = cloneDeep(itemsList[i].BatchNumbers);

                    //using 'i' for this 'for' block was causing trouble when scanning & adding 2nd Item.
                    //Already the above 'for' loop is using 'i'.
                    //the 2nd got added to all the Items in the table
                    //for(let b=0; b < batchList.length ; b++) {

                    let index = batchList.findIndex(
                      (batch) => batch.BatchNumber === scannedItem.BatchNumber,
                    );
                    for (let b = 0; b < batchList.length; b++) {
                      console.log("batchList[b].BatchNumber :" + batchList[b].BatchNumber);
                      console.log("scannedItem.BatchNumber :" + scannedItem.BatchNumber);
                      // if(batchList[b].BatchNumber === scannedItem.BatchNumber) {
                      if (index > -1) {
                        if (batchList[b].DocumentLinesBinAllocations) {
                          if (
                            Array.isArray(batchList[b].DocumentLinesBinAllocations) &&
                            batchList[b].DocumentLinesBinAllocations.length > 0
                          ) {
                            //TODO: Replace this 'for' block with 'findIndex'
                            for (
                              let d = 0;
                              d < batchList[b].DocumentLinesBinAllocations.length;
                              d++
                            ) {
                              //TODO: Need to add this condi. check for SerialNo.s too. Create a fucntion to
                              //take care of this validation
                              if (
                                batchList[b].DocumentLinesBinAllocations[d].BinCode ===
                                scannedItem.DocumentLinesBinAllocations[0].BinCode
                              ) {
                                this.setState({
                                  successMsg: "",
                                  warningMsg:
                                    "You can't add the same Batch No.-Bin combination twice. Please try a different one.",
                                });
                                this.clearToastMessage("warningMsg");
                                break;
                              } else {
                                //If the scanned Batch# is already added, but with a diff. Bin, add the rec.
                                batchList[b].DocumentLinesBinAllocations.push(
                                  ...scannedItem.DocumentLinesBinAllocations,
                                );
                                itemsList[i].BatchNumbers = batchList;
                                isTheScannedItemAdded = true;
                                break;
                              }
                            }
                          }
                          //When user attempts to add back a Bin that he just deleted, DocumentLinesBinAllocations
                          //will be a valid 'array' but without any elements in it
                          else {
                            batchList[b].DocumentLinesBinAllocations =
                              scannedItem.DocumentLinesBinAllocations;
                            itemsList[i].BatchNumbers = batchList;
                            isTheScannedBinAdded = true;
                            //Save the Batch's key to which the newly scanned Bin is added.
                            //This will be used to open appropirate Batch/Serial's popup
                            batchSerialKey = b;
                            itemKey = i;
                            break;
                          }
                        }
                        // this.setState({
                        //   successMsg: "",
                        //   warningMsg: "You can't add the same Batch No. twice. Please try a different one."
                        // });
                        // this.clearToastMessage("warningMsg");
                        // break;
                      } else {
                        //Add the scanned Item details to Trans. Item's Batch/Serial existing array
                        //NOTE: This was cause error
                        // itemsList[i].BatchNumbers.push(scannedItem);

                        batchList.push(scannedItem);
                        itemsList[i].BatchNumbers = batchList;
                        isTheScannedItemAdded = true;
                        break;
                      }
                    }
                  }
                  //if 'BatchNumbers' array is undefined (which will be teh case initally)
                  //add the scanned details this way
                  else {
                    //Didnt work!Threw error
                    // itemsList[i].BatchNumbers = [];
                    // itemsList[i].BatchNumbers.push(scannedItem);

                    batchList.push(scannedItem);
                    itemsList[i].BatchNumbers = batchList;
                    isTheScannedItemAdded = true;
                  }
                }
                // else if(scannedItem.InternalSerialNumber) {
                else if (itemsList[i].ManSerNum === "Y") {
                  console.log(
                    "itemsList[i].ItemCode - itemsList[i].ManSerNum: ",
                    itemsList[i].ItemCode,
                    " - ",
                    itemsList[i].ManSerNum,
                  );

                  //'length' must be > than '0' bcoz if the last Batch under an Item is deleted then
                  //this array will bcome empty [], not undefined (ELSE part will be executed only
                  //if is UNDEFINED, not [])
                  if (
                    Array.isArray(itemsList[i].SerialNumbers) &&
                    itemsList[i].SerialNumbers.length
                  ) {
                    serialList = cloneDeep(itemsList[i].SerialNumbers);

                    //using 'i' for this 'for' block was causing trouble when scanning & adding 2nd Item.
                    //Already the above 'for' loop is using 'i'.
                    //the 2nd got added to all the Items in the table
                    //for(let b=0; b < serialList.length ; b++) {

                    let index = serialList.findIndex(
                      (batch) => batch.InternalSerialNumber === scannedItem.InternalSerialNumber,
                    );

                    for (let b = 0; b < serialList.length; b++) {
                      console.log(
                        "serialList[b].InternalSerialNumber :" + serialList[b].InternalSerialNumber,
                      );
                      console.log(
                        "scannedItem.InternalSerialNumber :" + scannedItem.InternalSerialNumber,
                      );
                      // if(serialList[b].InternalSerialNumber === scannedItem.InternalSerialNumber) {
                      if (index > -1) {
                        if (serialList[b].DocumentLinesBinAllocations) {
                          if (
                            Array.isArray(serialList[b].DocumentLinesBinAllocations) &&
                            serialList[b].DocumentLinesBinAllocations.length > 0
                          ) {
                            //TODO: Replace this 'for' block with 'findIndex'
                            for (
                              let d = 0;
                              d < serialList[b].DocumentLinesBinAllocations.length;
                              d++
                            ) {
                              //TODO: Need to add this condi. check for SerialNo.s too. Create a fucntion to
                              //take care of this validation
                              if (
                                serialList[b].DocumentLinesBinAllocations[d].BinCode ===
                                scannedItem.DocumentLinesBinAllocations[0].BinCode
                              ) {
                                this.setState({
                                  successMsg: "",
                                  warningMsg:
                                    "You can't add the same Batch No.-Bin combination twice. Please try a different one.",
                                });
                                this.clearToastMessage("warningMsg");
                                break;
                              } else {
                                //If the scanned Serial# is already added, but with a diff. Bin, add the rec.
                                serialList[b].DocumentLinesBinAllocations.push(
                                  ...scannedItem.DocumentLinesBinAllocations,
                                );
                                itemsList[i].SerialNumbers = serialList;
                                isTheScannedItemAdded = true;
                                break;
                              }
                            }
                          }
                          //When user attempts to add back a Bin that he just deleted, DocumentLinesBinAllocations
                          //will be a valid 'array' but without any elements in it
                          else {
                            serialList[b].DocumentLinesBinAllocations =
                              scannedItem.DocumentLinesBinAllocations;
                            itemsList[i].SerialNumbers = serialList;
                            isTheScannedBinAdded = true;
                            //Save the Batch's key to which the newly scanned Bin is added.
                            //This will be used to open appropirate Batch/Serial's popup
                            batchSerialKey = b;
                            itemKey = i;
                            break;
                          }
                        }
                        // this.setState({
                        //   successMsg: "",
                        //   warningMsg: "You can't add the same Batch No. twice. Please try a different one."
                        // });
                        // this.clearToastMessage("warningMsg");
                        // break;
                      } else {
                        //Add the scanned Item details to Trans. Item's Batch/Serial existing array
                        //NOTE: This was cause error
                        // itemsList[i].SerialNumbers.push(scannedItem);

                        serialList.push(scannedItem);
                        itemsList[i].SerialNumbers = serialList;
                        isTheScannedItemAdded = true;
                        break;
                      }
                    }
                  }
                  //if 'SerialNumbers' array is undefined (which will be teh case initally)
                  //add the scanned details this way
                  else {
                    //Didnt work!Threw error
                    // itemsList[i].SerialNumbers = [];
                    // itemsList[i].SerialNumbers.push(scannedItem);

                    serialList.push(scannedItem);
                    itemsList[i].SerialNumbers = serialList;
                    isTheScannedItemAdded = true;
                  }
                }

                /* Commented this block and combined it with below ELSE IF block
                if (isTheScannedBinAdded) {
                  // this.handleItemSelection(itemKey, itemsList[itemKey]);

                  //Set the updated Item details to the 'selected' item in state
                  this.setState({ itemsList }, this.toggleBinAllocationPopover(batchSerialKey)); //itemKey, 
                }*/

                //Update the AddedQuanity if the scanned item is added to the Items table
                if (isTheScannedBinAdded || isTheScannedItemAdded) {
                  //else
                  //Close all Bin Alloc. popovers
                  this.toggleBinAllocationPopover(-1);

                  //Auto-select the scanned Item once the scanned Qty is added
                  this.handleItemSelection(i, itemsList[i]);

                  /** To auto-open the last scanned/added Bin, I need to get teh 'key' of the last
                   * scanned Batch/Serial no. As the elements added newly are added at the last, I can get
                   * this 'key' using below logic
                   * */
                  // const position = itemsList[i].BatchNumbers.length - 1;
                  itemKey = i;

                  if (scannedItem.BatchNumber) {
                    batchSerialKey = itemsList[i].BatchNumbers.length - 1;
                  } else if (scannedItem.InternalSerialNumber) {
                    batchSerialKey = itemsList[i].SerialNumbers.length - 1;
                  }

                  /* Addin the below line here throws below error, as I was trying to toggle/open a Popover which
                  * is not present in the DOM yet. Only after settign itemsList to state, the target ele. will
                  * be created in DOM.
                      **ERROR: The target 'batchBinPopOverBtn0' could not be identified in the dom,
                        tip: check spelling
                  */
                  // this.toggleBinAllocationPopover(itemsList[i].BatchNumbers.length - 1);

                  /**
                   * Commenting it now. May need to add to handleBinQtyChange()
                  //update AddedQuantity. set the value if it is the 1st scanned item or add the qty to teh 
                  //existing value
                  //NOTE, this custom field is only for validation purpose, it will not be sent to the API
                  if(isNaN(itemsList[i].AddedQuantity)) {
                    // || parseFloat(itemsList[i].AddedQuantity) === 0
                    itemsList[i].AddedQuantity = parseFloat(scannedBatchSerialRec.OnHandQty);
                  }
                  else {
                    itemsList[i].AddedQuantity
                      = parseFloat(itemsList[i].AddedQuantity) + parseFloat(scannedBatchSerialRec.OnHandQty);
                  }
                  */

                  //break the loop once the scanned item is added to a Row with matching Item & WH
                  break;
                }
                // isTheScannedItemValid = true;
              } else {
                this.setState({
                  successMsg: "",
                  warningMsg:
                    "Required quantity has already been added for Item " + itemsList[i].ItemCode,
                  batchSerialNo: "",
                });
                this.clearToastMessage("warningMsg");
                // return false;
                break;
              }
            }
          }
          if (!isTheScannedItemValid) {
            this.setState({
              warningMsg:
                "The item you attempted to add doesn't match any of the items in the below table. " +
                "Or the entered item's WH doesn't match the From WH in the request.",
              batchSerialNo: "",
            });
            // this.clearToastMessage("warningMsg");
          } else if (isTheScannedItemValid && (isTheScannedBinAdded || isTheScannedItemAdded)) {
            console.log("isTheScannedItemValid - itemsList: " + JSON.stringify(itemsList));

            // Open the Bin Allocation Popover only for Batch Items
            if (!isSerialItem) {
              this.setState(
                {
                  itemsList,
                  //this msg Doesn't disapper even if the Same batch# is added twice,
                  //no warnign msg is shown if this is presnet, so not using it now
                  successMsg: "Item added successfully!",
                  batchSerialNo: "",
                },
                () => this.toggleBinAllocationPopover(batchSerialKey),
              );
            }
            this.setState({
              itemsList,
              //this msg Doesn't disapper even if the Same batch# is added twice,
              //no warnign msg is shown if this is presnet, so not using it now
              successMsg: "Item added successfully!",
              batchSerialNo: "",
            });

            /** TODO: Calling the below fucnt. here is causing this error, so commented it for now. Need to
             * fix it to enable auto-popup when an Item is scanned
             * The target 'batchBinPopOverBtn0' could not be identified in the dom, tip: check spelling
             */
            //#1
            //Need to open the Popover automatically once the Item is scanned & added
            //this.toggleBinAllocationPopover(batchSerialKey) //itemKey,
            // );

            //#2 This method here threw teh above err when a Batch no. returned more than one Rec.
            //so adding it inside a 'callback' method in setState()
            //NOTE: Tried adding 'awai' to above setState() & it worked too, but it is not best practise so
            //added a callback method
            //Moving teh funct. out of 'setState' worked!!
            //this.toggleBinAllocationPopover(batchSerialKey);
            this.clearToastMessage("successMsg");
          }

          //this will be used to check/uncheck checkbox in the 'old' items modal
          return isTheScannedItemAdded || isTheScannedBinAdded;
        }
      } else {
        this.setState({
          warningMsg: `Scan an item that belongs to warehouse location '${selectedItem.LocationName}'.
          The one that you scanned belongs to '${scannedBatchSerialRec.LocationName}' location!`,
        });
        // this.clearToastMessage("warningMsg");
      }
    } else {
      this.setState({
        warningMsg: `Scan an item that belongs to warehouse '${selectedItem.WhsCode}'.
        The one that you scanned belongs to '${scannedBatchSerialRec.WhsCode}' warehouse!`,
      });
    }

    //this will be used to mark isSelected prop in the 'old' items modal
    return false;
  };

  /** To change Table Row background on mouse hover
   * @param {Number} key
   * @param {String} action mouse 'Over', 'Out' or "Click"
   */
  setItemRowEffect = (key, action) => {
    //moved this to customStyle.css
    /*let style = {
      cursor: "pointer",
      backgroundColor: (action ==="Over") ? "#F8F8F8": "#FFFFFF",
      fontWeight: (action === "Click") ? "bold" : "normal"
    }*/

    let itemRowEffect = [];
    if (action === "Click") {
      itemRowEffect[key] = { backgroundColor: "#F7F7F7", fontWeight: "bold" }; //light blue - #e1f2f7
    }
    //itemRowEffect[key] = style;
    this.setState({ itemRowEffect });
  };

  /**
   * Sets the `ManufacturerSerialNumber` to the Serial Item
   * @param {*} event
   * @param {*} batchSerialKey
   */
  handleMfgSerialNoChange = (event, batchSerialKey) => {
    this.setState({ warningMsg: "" });
    let itemsList = cloneDeep(this.state.itemsList);
    const { selectedItemKey } = this.state;

    /* signal to React not to nullify the event object */
    event.persist();

    itemsList[selectedItemKey].SerialNumbers[batchSerialKey].ManufacturerSerialNumber =
      event.target.value.trim();
    this.setState({ itemsList });
  };

  /**
   *
   * @param {*} event
   * @param {*} batchSerialKey
   * @param {*} binKey
   * @param {*} maxQuantity    Max. quantity that a user can enter
   */
  handleBinQuantityChange = (event, batchSerialKey, binKey, maxQuantity) => {
    this.setState({ warningMsg: "" });
    let itemsList = cloneDeep(this.state.itemsList);
    const { selectedItemKey } = this.state;

    /* signal to React not to nullify the event object */
    event.persist();

    let value = event.target.value.trim();
    let newQuantity = parseFloat(value);
    let batchSerialProp;

    // if(Array.isArray(itemsList[selectedItemKey].BatchNumbers) && itemsList[selectedItemKey].BatchNumbers.length > 0) {
    //   batchSerialProp = "BatchNumbers";
    // }
    // else if(Array.isArray(itemsList[selectedItemKey].SerialNumbers) && itemsList[selectedItemKey].SerialNumbers.length > 0) {
    //   batchSerialProp = "SerialNumbers";
    // }
    if (getItemType(itemsList[selectedItemKey]) === itemTypes.BATCHES) {
      batchSerialProp = "BatchNumbers";
    }
    if (getItemType(itemsList[selectedItemKey]) === itemTypes.SERIAL_NUMBERS) {
      batchSerialProp = "SerialNumbers";
    }

    // if (newQuantity < 0.001) {
    //   event.preventDefault();
    // }
    if (value === "") {
      itemsList[selectedItemKey][batchSerialProp][batchSerialKey].DocumentLinesBinAllocations[
        binKey
      ].Quantity = "";
      //this.setState({popupInvalidItemQuantity: true});
      this.setState({
        itemsList,
      });
    } else if (newQuantity > parseFloat(maxQuantity)) {
      this.setState({
        warningMsg: "Quantity entered cannot be greater than the Available Quantity in the Bin!",
      });
    } else {
      //itemsList[selectedItemKey].BatchNumbers[batchSerialKey].DocumentLinesBinAllocations[binKey].Quantity = newQuantity;
      itemsList[selectedItemKey][batchSerialProp][batchSerialKey].DocumentLinesBinAllocations[
        binKey
      ].Quantity = newQuantity;
      console.log(
        "itemsList[selectedItemKey][batchSerialProp][batchSerialKey].DocumentLinesBinAllocations[binKey]: " +
          itemsList[selectedItemKey][batchSerialProp][batchSerialKey].DocumentLinesBinAllocations[
            binKey
          ].OnHandQty,
      );

      //Get the total Bin Allocation after setting the new Qty & compare it with the Requested Qty
      if (
        this.getBinAllocationTotalInAllBatchSerials(itemsList[selectedItemKey]) <=
        parseFloat(itemsList[selectedItemKey].Quantity)
      ) {
        this.setState({ itemsList });
      }
      //If the Total is > than Requested Qty
      else {
        this.setState({
          warningMsg: "Quantity entered cannot be greater than the 'Remaining' Qty!",
        });
      }
    }
  };

  /**
   * Returns the sum of the Quantities of all the Bin Allocations under a Batch/Serial
   * @param {Array} documentLinesBinAllocations
   */
  getBinAllocationTotal = (documentLinesBinAllocations) => {
    let total = 0; //, lineQty = 0;
    if (
      documentLinesBinAllocations &&
      Array.isArray(documentLinesBinAllocations) &&
      documentLinesBinAllocations.length
    ) {
      documentLinesBinAllocations.forEach((line) => {
        //NOTE: When a Bin is newly added its Qty will be 'blank' this causes the total to
        //bcome NaN, so added below validation
        // lineQty = parseInt(line.Quantity);
        total = total + (isNaN(parseFloat(line.Quantity)) ? 0 : parseFloat(line.Quantity));
      });
    }
    return round(total, 5);
  };

  /**
   * TODO: Need to set this 'Total' in 'state', update it whenever Qty is changed
   * & reset it each time user clicks on a new Item & use it in ALL the places wherever this method
   * is called inside 'render()'.
   * Right now this method is called multiple times for each item, as it is invoked from multiple
   * places inside 'render()'
   *
   * Returns the sum of the Quantities of all the Bin Allocations under each Batch/Serial
   * @param {Object} selectedItem Item that user selects to allocate Bins under each batch/serial
   */
  getBinAllocationTotalInAllBatchSerials = (selectedItem) => {
    let total = 0,
      documentLinesBinAllocations,
      batchSerialList; //, lineQty = 0;
    if (!selectedItem) {
      selectedItem = this.state.itemsList[this.state.selectedItemKey];
    }
    if (selectedItem.BatchNumbers !== undefined && Array.isArray(selectedItem.BatchNumbers)) {
      batchSerialList = selectedItem.BatchNumbers;
    } else if (
      selectedItem.SerialNumbers !== undefined &&
      Array.isArray(selectedItem.SerialNumbers)
    ) {
      batchSerialList = selectedItem.SerialNumbers;
    }
    if (batchSerialList) {
      batchSerialList.forEach((batchSerial) => {
        documentLinesBinAllocations = batchSerial.DocumentLinesBinAllocations;

        if (
          documentLinesBinAllocations &&
          Array.isArray(documentLinesBinAllocations) &&
          documentLinesBinAllocations.length
        ) {
          documentLinesBinAllocations.forEach((line) => {
            //NOTE: When a Bin is newly added its Qty will be 'blank' this causes the total to
            //bcome NaN, so added below validation
            // lineQty = parseInt(line.Quantity);
            total = total + (isNaN(parseFloat(line.Quantity)) ? 0 : parseFloat(line.Quantity));
          });
        }
      });
    }
    return round(total, 5);
  };

  /**
   * Validate if the Required Quantity has been added for the currently selected Item
   * before user moves on to the next Item in the popup
   * @returns {Boolean}
   */
  validateBinAllocation = (selectedItemKey) => {
    let result = true;
    const { itemsList } = this.state;
    // if(selectedItemKey) { // this cond. fails when the 1st item is selected as it's `key` is `0`
    if (!isNaN(selectedItemKey)) {
      const selectedItem = itemsList[selectedItemKey];
      if (
        selectedItem &&
        parseFloat(selectedItem.Quantity) !==
          this.getBinAllocationTotalInAllBatchSerials(selectedItem)
      ) {
        result = false;
      }
    }
    //Validate ALL items if a 'selectedItemKey' is not passed
    else {
      //IF not all the items are clicked once return false
      // if(this.state.clickedItems.length === itemsList.length) {
      //   return false;
      // }
      // else {
      for (let i = 0; i < itemsList.length; i++) {
        const allocatedQty = this.getBinAllocationTotalInAllBatchSerials(itemsList[i]);
        const difference = parseFloat(itemsList[i].Quantity) - allocatedQty;

        // Perform the Quanity allocation check only for Batch & Serial Items
        if (
          (itemsList[i].ManBtchNum === "Y" || itemsList[i].ManSerNum === "Y") &&
          difference !== 0
        ) {
          this.setState({
            warningMsg: `Allocate the remaining '${difference}' quantities for the item '${itemsList[i].ItemCode}' at Line #${i + 1} to proceed.`,
          });
          result = false;
          break;
        }
        if (itemsList[i].ManSerNum === "Y") {
          // Find the Serial rec. WO Mfg Sr.#
          const invalidRec = itemsList[i].SerialNumbers.find(
            (serial, serialKey) => !serial.ManufacturerSerialNumber,
          );
          if (invalidRec) {
            this.setState({
              warningMsg: `Manufacturer Serial# is missing for Serial Number '${invalidRec.InternalSerialNumber}', selected for Item '${itemsList[i].ItemCode}'.`,
            });
            result = false;
            break;
          }
        }
      }
      // }
    }
    return result;
  };

  /**
   * Returns the position of the 1st Batch/Serial Item in the 'itemsList'
   * @param {*} itemsList
   * @returns
   */
  getItemIndexForAutoSelection = () => {
    const { itemsList } = this.props;
    const index = itemsList.findIndex((item) => item.ManBtchNum === "Y" || item.ManSerNum === "Y");
    return index;
  };

  /**
   * Creates Batch or SerialNo. for the selected Item in the pop-up window
   * @param {Number} key      Selected Item's "key" in the table
   * @param {Object} item  Selected Item
   */
  handleItemSelection = async (key, item) => {
    let clickedItems = [...this.state.clickedItems];
    console.log(`handleItemSelection = (${key}, ${clickedItems})`); //, ${item.ItemCode}

    /** Skip the 'Bin Allocation' validation if the selected Item is the 1st item that the user clicks
     * or if the QRCodeScanner is used to add Batch/Serial Qtys. Bcoz this validation is not required
     * if user is going to add Qty via Scanner
     **/
    if (
      !clickedItems.length ||
      this.state.selectedItemKey === key ||
      (clickedItems.length && this.validateBinAllocation(this.state.selectedItemKey)) ||
      this.props.showQRCodeScanner
    ) {
      /**TODO:
       * Validate if the user has entered all the details for the current Row's Created Batch/Sr. No
       * b4 moving to the new Row
       */
      //When user attempts to select a 'new' item in the modal, add the current item to the 'itemsList'
      if (this.state.selectedItemKey !== key) {
        this.setItemRowEffect(key, "Click");

        /** Check if the passed "key" is present in the array, if not push it in.
         * This array will be used to check if ALL the Items listed in the popup are clicked
         **/
        if (!clickedItems.includes(key)) {
          clickedItems.push(key);
        }

        this.setState({
          // itemsList,
          selectedItemKey: key,
          clickedItems,
          popupWarningMsg: "",
        });
      }
    } else {
      this.setState({
        warningMsg: `Add required Quanities for item '${this.state.itemsList[this.state.selectedItemKey].ItemCode}' before moving to the next item!`,
      });
    }
  };

  /** Saves the Batch or SerialNo. details entered in the pop-up window
   */
  handleSave = () => {
    if (this.validateBinAllocation()) {
      this.props.handleSave(this.state.itemsList);
    }
    // else {
    //   this.setState({ warningMsg: "Allocate requested quantities for all the listed items to proceed..." });
    // }
  };

  initialize = async () => {
    this.setState(
      {
        itemsList: this.props.itemsList,
      },
      async () => await this.handleItemSelection(this.getItemIndexForAutoSelection()),
    );
    /* Commenting thsi out as it is NOT required when Scan option is enabled. ENABLE this auto-select
    * feature when Scan QR Code is disabled
    ,
    () => {
      //Get the 1st item to get auto-selected when the Modal is opened
      //this is used when teh 1st item is a NORMAL or LABOR item which will not be shown
      //in the Modal
      const key = this.getItemIndexForAutoSelection(this.props.itemsList);
      
      //Auto-select 1st Item when Modal is loaded
      this.handleItemSelection(key, this.props.itemsList[key]);
    });
    */
    // this.handleItemSelection(0);
  };

  async componentDidUpdate(prevProps, prevState) {
    // console.log("componentDidUpdate this.props: "+ JSON.stringify(this.props));
    // if (this.props.itemsList && !prevProps.itemsList && this.props.isOpen) {
    //   await this.initialize();
    // }
    /* Commenting thsi out as it is NOT required when Scan option is enabled. ENABLE this auto-select
    * feature when Scan QR Code is disabled

    if (this.props.itemsList && !prevProps.itemsList) {
      //Get the 1st item to get auto-selected when the Modal is opened
      //this is used when teh 1st item is a NORMAL or LABOR item which will not be shown
      //in the Modal
      const key = this.getItemIndexForAutoSelection(this.props.itemsList);
      
      //Auto-select 1st Item when Modal is loaded
      this.handleItemSelection(key, this.props.itemsList[key]);
    }
    */
  }

  async componentDidMount() {
    console.log("componentDidMount this.props: " + JSON.stringify(this.props));
    if (Array.isArray(this.props.itemsList) && this.props.itemsList.length > 0) {
      await this.initialize();
    }
    //Get ExpDate Logic
    // Get today's date
    const today = moment();

    // Add 6 months
    const expDate = today.clone().add(6, "months");

    const formattedExpDate = expDate.format("DD/MM/YY");

    // Update state with the formatted dates
    this.setState({
      formattedExpDate,
    });
  }

  render() {
    const { itemsList } = this.state; //selectedItem
    let columnTitle = "";

    let selectedBatchSerialNumber = [];
    const itemsTableHeader = ["#", "Item No.", "Item Description", "Qty", "Warehouse"];

    let disabled = false;
    if (this.props.operation !== displayModes.CREATE) {
      disabled = true;
    }

    let selectedItem = itemsList[this.state.selectedItemKey];
    let selectedItemType;
    // let selectedItemHasBatchOrSerial =
    //   selectedItem && Array.isArray(selectedItem.BatchSerialList) && selectedItem.BatchSerialList.length > 0;

    if (
      selectedItem?.BatchNumbers &&
      Array.isArray(selectedItem.BatchNumbers) &&
      selectedItem.BatchNumbers.length > 0
    ) {
      selectedItemType = itemTypes.BATCHES;
      columnTitle = "Batch";
      selectedBatchSerialNumber = selectedItem.BatchNumbers;
    } else if (
      selectedItem?.SerialNumbers &&
      Array.isArray(selectedItem.SerialNumbers) &&
      selectedItem.SerialNumbers.length > 0
    ) {
      selectedItemType = itemTypes.SERIAL_NUMBERS;
      columnTitle = "Serial";
      selectedBatchSerialNumber = selectedItem.SerialNumbers;
    }

    let batchSerialNoHeader = ["", "#", columnTitle + "#", "Qty"]; //, "Line Num"
    // Display Available Qty only for Batch items
    if (selectedItemType === itemTypes.BATCHES) {
      //this.props.operation === displayModes.CREATE &&
      batchSerialNoHeader.splice(3, 0, "Available Qty");
    } else {
      batchSerialNoHeader.splice(3, 0, "Manufacturer Serial#");
    }

    return (
      <>
        <CustomModal
          modalSize="xxl"
          buttonSize="lg"
          isOpen={this.props.isOpen}
          title={"Batch & Serial Number Selection"}
          infoMessage={"Select an item & add required Batch, Serials Nos."}
          // isLoading={props.isLoading}
          hideCloseButton={false}
          closeModal={this.cancelPopup}
          handleSubmit={this.handleSave}
          warningMsg={this.state.popupWarningMsg}
        >
          <Row>
            <Col className="shadow mt--4 pt-2">
              {/** Batch, Serial Items */}
              <Card className="table-fixed-head table-fixed-head-sm table-fixed-head-resize">
                {" "}
                {/**  */}
                <Table size="sm" className="align-items-center table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      {itemsTableHeader.map((headerCol, key) => {
                        return (
                          <th scope="col" key={headerCol}>
                            {headerCol}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(itemsList) && itemsList.length
                      ? itemsList.map((item, key) => {
                          //Show only the Batch & Serial items (hide Normal & Labor items)
                          if (
                            item.ManBtchNum === "Y" ||
                            item.ManSerNum === "Y" ||
                            item.InvntItem === "Y"
                          ) {
                            return (
                              <tr
                                key={item.ItemCode}
                                className="neo-tr"
                                style={this.state.itemRowEffect[key]} /** {{cursor:"pointer"}}  */
                                onClick={
                                  //Enable 'onClick' only when the selected item is not the current one
                                  this.state.selectedItemKey !== key
                                    ? async () => await this.handleItemSelection(key, item)
                                    : undefined
                                }
                                /*onMouseOver={() => this.setItemRowEffect(key, "Over")}
                            onMouseOut={() => this.setItemRowEffect(key, "Out")}
                            */
                                /**
                                 * onMouseOver={() => this.setState({itemHoverEffect[key]: {cursor: "pointer", backgroundColor:"#F8F8F8"}})}
                                 * onMouseOut={() => this.setState({itemHoverEffect[key]: {backgroundColor: "#FFFFFF"}})}
                                 */
                              >
                                <td>{key + 1}</td>
                                <td>{item.ItemCode}</td>
                                <td style={{ whiteSpace: "unset" }}>{item.ItemName}</td>
                                <td>{parseFloat(item.Quantity).toFixed(5)}</td>
                                {/* <td>{item.LineNum}</td> */}
                                <td>{item.WhsCode}</td>
                              </tr>
                            );
                          }
                        })
                      : null}
                  </tbody>
                </Table>
              </Card>
              <Row>
                <Col className="border-0">
                  {this.props.operation === displayModes.CREATE &&
                    this.props.showQRCodeScanner &&
                    selectedItem && (
                      <BatchSerialsSelectionModal
                        itemsList={this.state.itemsList}
                        selectedItemCode={selectedItem?.ItemCode}
                        addScannedBatchSerialItemToRow={this.handleScan}
                        openModalOnItemClick={true}
                      />
                    )}
                  {/** Created Batches/Serial Nos. */}
                  <h4 className="mb-3 mt-3">
                    Selected {columnTitle} Number -{" "}
                    {selectedItem ? selectedItem.ItemCode : "Not Selected"}
                  </h4>
                  {this.props.operation === displayModes.CREATE && (
                    <Row className="ml--2 mb-2 text-sm">
                      <Col className="text-primary">
                        Required:{" "}
                        <b>{selectedItem ? round(parseFloat(selectedItem.Quantity), 5) : 0}</b>{" "}
                      </Col>
                      <Col className="text-success">
                        Allocated:
                        <b>
                          {selectedItem
                            ? round(this.getBinAllocationTotalInAllBatchSerials(selectedItem), 5)
                            : ""}
                        </b>
                      </Col>
                      <Col className="text-danger">
                        Remaining:
                        <b>
                          {selectedItem
                            ? round(
                                parseFloat(selectedItem.Quantity) -
                                  this.getBinAllocationTotalInAllBatchSerials(selectedItem),
                                5,
                              )
                            : 0}
                        </b>
                      </Col>
                    </Row>
                  )}

                  <Card className="mt-0 shadow">
                    {" "}
                    {/** table-fixed-head table-fixed-head-sm */}
                    {/* DIDN'T WORK!
                <PerfectScrollbar style ={{
                  height: "100px",
                  position: "relative"
                }}>*/}
                    <Table
                      size="sm"
                      className="align-items-center table-flush"
                      responsive
                      //style={{ overflow: 'auto', height: '150px' }} //DIDN't Work
                    >
                      <thead className="thead-light">
                        <tr>
                          {batchSerialNoHeader.map((headerCol, key) => {
                            return (
                              <th scope="col" key={key}>
                                {headerCol}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Need to create a comp. to display below Table ofr Batch & Serial Items.
                      This is lenghty code, duplicating them all for Serial Items woudl be terrible.
                      
                      {Array.isArray(selectedItem.SerialNumbers) && selectedItem.SerialNumbers.length > 0} */}
                        {Array.isArray(selectedBatchSerialNumber) &&
                        selectedBatchSerialNumber.length > 0 ? (
                          selectedBatchSerialNumber.map((batchSerial, batchSerialKey) => {
                            return (
                              <tr
                                key={
                                  batchSerial.BatchNumber
                                    ? batchSerial.BatchNumber
                                    : batchSerial.InternalSerialNumber
                                }
                              >
                                {/*
                            TODO: Need to work on this. Deleting & adding an Batch/Sserial back
                            doesnt show up in UI. Need to debug! */}
                                <td>
                                  {this.props.operation === displayModes.CREATE && (
                                    <Trash2
                                      id={`batchSerialKey_${batchSerialKey}`}
                                      size={20}
                                      className="mr-1 pb-1 text-danger cursor-pointer"
                                      onClick={() => this.handleDeleteBatchSerial(batchSerialKey)}
                                    />
                                  )}
                                </td>
                                <td>{batchSerialKey + 1}</td>
                                <td>
                                  {batchSerial.BatchNumber
                                    ? batchSerial.BatchNumber
                                    : batchSerial.InternalSerialNumber}
                                </td>
                                {/* Display this field only for Serial Items */}

                                <td>
                                  {batchSerial.InternalSerialNumber ? (
                                    <Input
                                      bsSize="sm"
                                      type="text"
                                      disabled={disabled}
                                      style={{ width: 80 + "%" }}
                                      value={batchSerial.ManufacturerSerialNumber}
                                      className={
                                        "form-control display-4 text-gray-dark " +
                                        this.state.inValidInput
                                      }
                                      id="input-freight-amt"
                                      placeholder="Enter a value"
                                      onChange={(e) =>
                                        this.handleMfgSerialNoChange(e, batchSerialKey)
                                      }
                                    />
                                  ) : (
                                    <>{round(batchSerial.AvailableQuantity, 5)}</>
                                  )}
                                </td>
                                {/* <td>{parseFloat(batchSerial.Quantity).toFixed(3)}</td> */}
                                {/* <td>{JSON.stringify(batch)}</td> */}
                                <td>
                                  <span
                                    id={"batchBinPopOverBtn" + batchSerialKey}
                                    className="text-primary text-underline cursor-pointer"
                                  >
                                    {this.getBinAllocationTotal(
                                      batchSerial.DocumentLinesBinAllocations,
                                    )}
                                  </span>
                                  <Popover
                                    hideArrow={true}
                                    placement="auto"
                                    isOpen={this.state.binAllocationPopOver[batchSerialKey]}
                                    target={"batchBinPopOverBtn" + batchSerialKey}
                                    style={{ width: "100%" }}
                                    toggle={() => this.toggleBinAllocationPopover(batchSerialKey)}
                                  >
                                    <h4 className="ml-3 mt-2">Bin Allocation</h4>
                                    <span style={{ position: "fixed", top: 7, right: 12 }}>
                                      <X
                                        size={18}
                                        className="text-danger ml-2 cursor-pointer"
                                        onClick={() =>
                                          this.toggleBinAllocationPopover(batchSerialKey)
                                        }
                                      />
                                    </span>
                                    <Row className="ml-1 mb-2">
                                      <Col className="text-primary">
                                        Required:{" "}
                                        <b>{round(parseFloat(selectedItem.Quantity), 5)}</b>{" "}
                                      </Col>
                                      <Col className="text-success">
                                        Allocated:
                                        <b>
                                          {round(
                                            parseFloat(
                                              this.getBinAllocationTotalInAllBatchSerials(),
                                            ),
                                            5,
                                          )}
                                        </b>
                                      </Col>
                                      <Col className="text-danger">
                                        Remaining:
                                        <b>
                                          {round(
                                            parseFloat(selectedItem.Quantity) -
                                              this.getBinAllocationTotalInAllBatchSerials(),
                                            5,
                                          )}
                                        </b>
                                      </Col>
                                    </Row>
                                    <PopoverBody>
                                      <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                                        <Table
                                          size="sm"
                                          // className="ml--3 mt--1 mb--2 table-sm">
                                          className="ml-0 mt--2 mb-0 mr--1 table-sm"
                                        >
                                          <thead style={{ backgroundColor: "#8e7ef324" }}>
                                            <tr>
                                              <th scope="col">#</th>
                                              <th scope="col">Bin Code</th>
                                              <th scope="col">Exp Date</th>
                                              {this.props.operation === displayModes.CREATE && (
                                                <th scope="col">Available</th>
                                              )}
                                              <th scope="col">Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {Array.isArray(
                                              batchSerial.DocumentLinesBinAllocations,
                                            ) &&
                                            batchSerial.DocumentLinesBinAllocations.length > 0 ? (
                                              batchSerial.DocumentLinesBinAllocations.map(
                                                (batchBin, binKey) => {
                                                  return (
                                                    <tr
                                                      key={batchBin.BinAbsEntry + binKey}
                                                      id={"trId" + binKey}
                                                    >
                                                      <td>
                                                        {this.props.operation ===
                                                          displayModes.CREATE &&
                                                          //hide the del. icon if only ONE Bin is added under a Batch/Serial is added.
                                                          //Let the user delete the whole Batch/Serial rec. if only one Bin is present
                                                          batchSerial.DocumentLinesBinAllocations
                                                            .length > 1 && (
                                                            <Trash2
                                                              id={`batch_${binKey}`}
                                                              size={20}
                                                              className="mr-1 pb-1 text-danger cursor-pointer"
                                                              onClick={() =>
                                                                this.handleDeleteBinAllocation(
                                                                  batchSerialKey,
                                                                  binKey,
                                                                )
                                                              }
                                                            />
                                                          )}
                                                      </td>
                                                      <td className="pt-3">{batchBin.BinCode}</td>
                                                      <td className="pt-3">
                                                        {this.state.formattedExpDate}
                                                      </td>
                                                      {this.props.operation ===
                                                        displayModes.CREATE && (
                                                        <td className="pt-3">
                                                          {parseFloat(batchBin.OnHandQty)}
                                                        </td>
                                                      )}
                                                      <td>
                                                        <Input
                                                          bsSize="sm"
                                                          disabled={disabled}
                                                          style={{ width: 80 + "%" }}
                                                          value={batchBin.Quantity}
                                                          className={
                                                            "form-control display-4 text-gray-dark " +
                                                            this.state.inValidInput
                                                          }
                                                          id="input-freight-amt"
                                                          placeholder=""
                                                          type="number"
                                                          onChange={
                                                            // (e) => this.handleBinDetailsChange(batchSerial.BaseLineNumber, batchSerial.BatchNumber, e.target.value, binKey, "QUANTITY", batchSerial.Quantity, batchSerial.DocumentLinesBinAllocations)
                                                            (e) =>
                                                              this.handleBinQuantityChange(
                                                                e,
                                                                batchSerialKey,
                                                                binKey,
                                                                batchBin.OnHandQty,
                                                              )
                                                          }
                                                        />
                                                      </td>
                                                    </tr>
                                                  );
                                                },
                                              )
                                            ) : (
                                              <tr>
                                                <td colSpan="4" className="text-blue">
                                                  <i className="fa fa-info-circle" /> &nbsp; Scan or
                                                  Enter Batch/Serial# to allocate quantity
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </Table>
                                      </div>
                                      {this.state.binAllocationWarningMsg && (
                                        <Row className="ml-1">
                                          <Col>
                                            {showWarningMsg(this.state.binAllocationWarningMsg)}
                                          </Col>
                                        </Row>
                                      )}
                                    </PopoverBody>
                                  </Popover>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4">...</td>
                          </tr>
                        )}
                      </tbody>
                      {/* <tfoot>
                      <td></td>
                      <td align="left">Total</td>
                      <td>{this.state.currentBatchSerialItemTotal}</td>
                    </tfoot> */}
                    </Table>
                    {/*</PerfectScrollbar>*/}
                  </Card>
                </Col>
              </Row>
            </Col>
            <Col className="shadow pt--1 ml-2 mt--4 px-0">
              {this.props.operation === displayModes.CREATE &&
                !this.props.showQRCodeScanner &&
                selectedItem && (
                  <BatchSerialsSelectionCard
                    itemsList={this.state.itemsList}
                    selectedItemCode={selectedItem?.ItemCode}
                    deletedBatchSerialRec={this.state.deletedBatchSerialRec}
                    resetDeletedBatchSerialRec={this.resetDeletedBatchSerialRec}
                    addScannedBatchSerialItemToRow={this.handleScan}
                  />
                )}
            </Col>
          </Row>
        </CustomModal>

        {/* Toast messages */}
        {this.state.infoMsg && <ToastMessage type="info" message={this.state.infoMsg} />}
        {this.state.warningMsg && <ToastMessage type="warning" message={this.state.warningMsg} />}
        {this.state.successMsg && <ToastMessage type="success" message={this.state.successMsg} />}
      </>
    );
  }
}
