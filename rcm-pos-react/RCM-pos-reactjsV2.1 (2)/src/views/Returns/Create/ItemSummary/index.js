import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardFooter, Spinner } from "reactstrap";
import HeaderCardWithSubtitle from "../../../../components/Headers/HeaderCardWithSubtitle";
import ItemsTable from "./ItemsTable.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";

import { ReturnsContext } from "./../context/ReturnsContext.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";

import { getInvoiceItems } from "../../../../helper/invoice.js";
import { createCreditMemo } from "../../../../helper/credit-memo.js";
import { statusColors, timYardItemGroups } from "../../../../config/config.js";

const ItemSummary = ({ onSubmitSuccess }) => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const {
    selectedInvoice,
    returnsItems,
    resetItems,
    creditMemoResponse,
    setCreditMemoResponse,
    setSelectedInvoice,
    setReturnsItems,
    setPaidAmount,
    setTaxProp,
    attachmentFile, // From Context
    setAttachmentFile, // From Context
  } = useContext(ReturnsContext);

  const [isItemsSelected, setIsItemsSelected] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = () => {
    resetItems();
    setSelectedInvoice("");
    setCreditMemoResponse("");
    setWarningMsg("");
  };

  const getDocumentLinesAndInvoiceUpdateRequest = () => {
    const docLines = [],
      invoiceUpdateRequest = [];

    returnsItems.forEach((item, key) => {
      if (item.isSelectedForReturn) {
        docLines.push({
          ItemCode: item.ItemCode,
          WarehouseCode: item.WhsCode,
          Quantity: item.Quantity,
          Price: item.Price,
          DiscountPercent: item.DiscountPercent,
          VatGroup: item.VatGroup,
          TaxPercentagePerRow: item.TaxPercent,
          TaxTotal: item.TaxLocal,
          LineTotal: item.TotalPrice,
          COGSCostingCode: item.COGSBranch,
          U_ReturnedInvoiceNos: item.DocNum,
          U_ReturnedQty: item.Quantity,
          U_RemainingOpenQty: item.InvoiceQuantity - item.Quantity,
          U_ReturnReason: item.U_ReturnReason,
          DocumentLinesBinAllocations: [],
        });

        invoiceUpdateRequest.push({
          DocEntry: item.DocEntry,
          LineNum: item.LineNum,
          U_ReturnedQty: item.U_ReturnedQty ? item.U_ReturnedQty + item.Quantity : item.Quantity,
          U_RemainingOpenQty: item.InvoiceQuantity - item.Quantity,
        });
      }
    });
    return { docLines, invoiceUpdateRequest };
  };

  const validateForm = () => {
    for (let i = 0; i < returnsItems.length; i++) {
      if (returnsItems[i].isSelectedForReturn) {
        if (
          !returnsItems[i].Quantity ||
          (returnsItems[i].Quantity < 0 && !timYardItemGroups.includes(returnsItems[i].ItmsGrpName))
        ) {
          setWarningMsg(
            `Please enter a valid Quantity for Item Code ${returnsItems[i].ItemCode} at Line #${i + 1}.`,
          );
          return false;
        } else if (!returnsItems[i].U_ReturnReason) {
          setWarningMsg(
            `Please enter a valid Return Reason for Item Code ${returnsItems[i].ItemCode} at Line #${i + 1}.`,
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setWarningMsg("");
      setIsLoading(true);

      const { docLines, invoiceUpdateRequest } = getDocumentLinesAndInvoiceUpdateRequest();

      const creditMemoRequest = {
        CardCode: selectedInvoice.CardCode,
        Comments: `${userSessionLog?.storeLocation} - Created via POS.`,
        SalesPersonCode: selectedInvoice.SalesPersonCode,
        BPL_IDAssignedToInvoice: userSessionLog?.locationDefaults?.Branch,
        U_Location: userSessionLog?.storeLocation,
        U_CreatedBy: userSessionLog?.userName + " - " + userSessionLog?.counterName,
        DocumentLines: docLines,
      };

      // 🔹 PREPARE FORMDATA FOR ATTACHMENT
      const formData = new FormData();

      // 1. Append attachment if it exists (Key MUST match backend: "attachment")
      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
      }

      // 2. Append JSON data as a string (Backend will JSON.parse this)
      const salesReturnData = [creditMemoRequest, invoiceUpdateRequest];
      formData.append("salesReturnData", JSON.stringify(salesReturnData));

      try {
        const response = await createCreditMemo(formData);

        if (response && response.DocNum) {
          setCreditMemoResponse(response);

          // 🔹 SUCCESS CLEANUP
          resetItems(); // Clears items and context file
          setPaidAmount(0);
          setTaxProp("");
          setAttachmentFile(null); // Safety clear

          if (onSubmitSuccess) {
            onSubmitSuccess(); // Clears the file input ref in Grid.jsx
          }
        }
      } catch (err) {
        setWarningMsg(err.response?.data?.message || err.message || "Submission failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isItemsSelectedForReturn = () => {
    return returnsItems.some((item) => item.isSelectedForReturn);
  };

  useEffect(() => {
    if (returnsItems) {
      setIsItemsSelected(isItemsSelectedForReturn());
    }
  }, [returnsItems]);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const items = await getInvoiceItems(selectedInvoice.DocNum);
        setReturnsItems(items?.itemsList);
      } catch (err) {
        setWarningMsg(err?.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (selectedInvoice.DocNum) {
      fetchItems();
    }
  }, [selectedInvoice, selectedInvoice?.DocNum]);

  return (
    <>
      <Card className="shadow">
        {creditMemoResponse?.DocNum ? (
          <CardBody className="p-0">
            <Row className="text-center">
              <Col>
                <DisplayMessage
                  className={"mt-3 display-4"}
                  type={statusColors.SUCCESS}
                  message={`Return Request #${creditMemoResponse.DocNum} created successfully!`}
                />
              </Col>
            </Row>
          </CardBody>
        ) : (
          <>
            <div className="pb-1">
              <HeaderCardWithSubtitle
                title={`Invoice# ${selectedInvoice.DocNum}`}
                subTitle={"Scan an item to add it to the Return request."}
              />
            </div>
            <CardBody className="p-0">
              <ItemsTable setWarningMsg={setWarningMsg} />
            </CardBody>
          </>
        )}
        <CardFooter className="border-0">
          {isLoading ? (
            <>
              <small className="my-2 text-primary">Processing... &emsp;</small>
              <Spinner color="primary" className="reload-spinner" />
            </>
          ) : (
            <Row>
              <Col className="text-left">
                <Button color="info" onClick={handleCancel} className="btn-square" size="lg">
                  Back
                </Button>
              </Col>
              <Col md="6">
                {warningMsg && (
                  <DisplayMessage
                    type={statusColors.WARNING}
                    iconSize="text-sm"
                    message={warningMsg}
                  />
                )}
              </Col>
              {isItemsSelected && !creditMemoResponse?.DocNum && (
                <Col className="mr-2 text-right">
                  <Button color="success" onClick={handleSubmit} className="btn-square" size="lg">
                    Submit
                  </Button>
                </Col>
              )}
            </Row>
          )}
        </CardFooter>
      </Card>
    </>
  );
};

export default ItemSummary;
