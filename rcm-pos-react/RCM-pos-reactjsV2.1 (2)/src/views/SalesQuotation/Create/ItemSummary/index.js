import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardHeader, CardFooter, Spinner } from "reactstrap";
import HeaderCard from "../../../../components/Headers/HeaderCardSmall.js";
import ItemsTable from "./ItemsTable.jsx";
import CustomerInfo from "../../../components/POS/CustomerInfo.js";
import OneTimeCustomerInfo from "../../../components/POS/OneTimeCustomerInfo.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";

import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesQuotationContext } from "../context/SalesQuotationContext.js";

import { formatDate, getValidNumber } from "../../../../config/util.js";
import {
  createSalesQuotation,
  getSalesQuotationItems,
  updateSalesQuotation,
} from "../../../../helper/sales-quotation";
import {
  getSalesQuotationRequest,
  getSalesBatchSelection,
} from "../../../common-utils/prepare-payload.util.js";
import {
  countryCode,
  statusColors,
  customerTypes,
  portalModules,
  DEFAULT_BRANCH_ID,
  PAYMENT_METHODS,
  CASH_BANK_ACCOUNT_CODE,
  PRECISION,
  displayModes,
} from "../../../../config/config.js";
import { roundPrice } from "views/common-utils/calculations.util.js";
import { appPaths } from "../../../../config/config.js";
import { useHistory } from "react-router-dom";

const ItemSummary = () => {
  const { userSessionLog, getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);
  const {
    customer,
    salesQuotationItems,
    setItem,
    resetItems,
    salesQuotationHeader,
    resetSalesQuotationHeader,
    salesQuotationResponse,
    setSalesQuotationResponse,
    setSalesQuotationCustomer,
    setSalesQuotationItem,
    setPaidAmount,
    setTaxProp,
    isOneTimeCustomer,
    setIsOneTimeCustomer,
    isCODCustomer,
    setIsCODCustomer,
    customerAddress,
    setCustomerAddress,
    itemsDeleted,
    setItemsDeleted,
    oneTimeCustomerDetails,
    setOneTimeCustomerDetails,
    getTotalQuantity,
    getTotalTax,
    getTaxableAmount,
    getTotalSalesQuotationAmount,
    timYardTransactions,
    isEditQuotation,
    setEditQuotation,
    paymentInfo,
    setPaymentInfo,
  } = useContext(SalesQuotationContext);

  const [warningMsg, setWarningMsg] = useState("");
  const [paymentTypes, setPaymentTypes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionTitle, setTransactionTitle] = useState("");
  const history = useHistory();

  // Resets Customer & Items details in the `context`
  const resetSalesQuotationData = () => {
    setIsOneTimeCustomer(true);
    setOneTimeCustomerDetails("");
    setIsCODCustomer(false);

    setSalesQuotationCustomer({});
    setCustomerAddress("");
    resetSalesQuotationHeader({});
    resetItems();
    setPaymentInfo({});
    setPaidAmount(0);
    setTaxProp("");
    setSalesQuotationResponse("");
    setWarningMsg("");
    setEditQuotation(false);
    history.push(`${appPaths.CREATE_QUOTATION}`);
  };

  const validateForm = () => {
    console.log("customerAddress", customerAddress);
    if (!isOneTimeCustomer && (!customer || !customer.CardName || !customer.CardCode)) {
      setWarningMsg("Select a Customer to proceed!");
      return false;
    } else if (
      !salesQuotationHeader?.SalesPersonCode ||
      salesQuotationHeader.SalesPersonCode === -1
    ) {
      setWarningMsg("Select a Sales Employee.");
      return false;
    }
    // else if (!salesQuotationHeader?.NumAtCard || salesQuotationHeader.NumAtCard === -1) {
    //   setWarningMsg("Enter a Reference#.");
    //   return false;
    // }
    // Address is mandatory for non-OT Customers
    else if (!isOneTimeCustomer && !customerAddress) {
      setWarningMsg("Select an Address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setWarningMsg("");
      handleSalesQuotationSubmit();
    } else {
      console.log("Warning:");
    }
  };

  const handleSalesQuotationSubmit = async () => {
    setIsLoading(true);
    // Set the CardCode with a default value when the customer is an OTC
    const cardCode = !isOneTimeCustomer
      ? customer.CardCode
      : getLocationBasedDefaultCardCode(isCODCustomer);

    // Post value with 5 Digits precision for SAP to accept it
    const salesQuotationAmount = roundPrice(getTotalSalesQuotationAmount(PRECISION));

    const request = getSalesQuotationRequest(
      cardCode,
      salesQuotationAmount,
      salesQuotationHeader,
      salesQuotationItems,
      customerAddress,
      isCODCustomer,
      oneTimeCustomerDetails,
      userSessionLog.storeLocation,
      userSessionLog?.locationDefaults?.Branch,
      isEditQuotation,
    );
    request.CompanyCode = process.env.REACT_APP_COMPANY_NAME;

    if (customerAddress.Address2) {
      request.Address2 = customerAddress.Address2;
    }

    console.log("request before fetching items", JSON.stringify(itemsDeleted));
    if (isEditQuotation && itemsDeleted.length > 0) {
      console.log("itemsDeleted", itemsDeleted);
      request.ItemsDeleted = itemsDeleted;
    }

    console.log("timYardTransactions", timYardTransactions);
    if (timYardTransactions && Object.keys(timYardTransactions).length > 0) {
      const requestSalesBatch = getSalesBatchSelection(
        salesQuotationItems,
        timYardTransactions,
        salesQuotationHeader,
        isEditQuotation,
      );
      request.salesBatchSelection = requestSalesBatch;
    } else {
      request.salesBatchSelection = [];
    }
    console.log("Create Sales Quotation request: ", JSON.stringify(request));
    // setIsLoading(false);
    // return;

    try {
      //Create Sales Quotation
      let response = "";
      if (isEditQuotation) {
        response = await updateSalesQuotation(request);
        console.log("Update Sales Quotation Response: ", JSON.stringify(response));
      } else {
        response = await createSalesQuotation(request);
        console.log("Create Sales Quotation Response: ", JSON.stringify(response));
      }

      if (response && response.docNum) {
        setSalesQuotationResponse(response);
      }
      //resetSalesQuotationData()
    } catch (err) {
      if (err.response?.data?.message) {
        setWarningMsg(err.response.data.message);
      } else {
        setWarningMsg(err.message || String(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isEditQuotation) {
      console.log("salesQuotationHeader--->", JSON.stringify(salesQuotationHeader));
      var title = `Sales Quotation# ${salesQuotationHeader.DocNum}`;
      setTransactionTitle(title);
    } else {
      var title = "Transaction";
      setTransactionTitle(title);
    }
  }, [isEditQuotation]);

  return (
    <>
      <Card className="shadow">
        <HeaderCard
          title={transactionTitle}
          className="border-0"
          rightContent={
            salesQuotationResponse?.docNum ? (
              <DisplayMessage
                type={statusColors.SUCCESS}
                iconSize="text-sm"
                message={
                  isEditQuotation
                    ? `Sales Quotation #${salesQuotationResponse?.docNum} updated successfully!`
                    : `Sales Quotation #${salesQuotationResponse?.docNum} created successfully!`
                }
              />
            ) : !isOneTimeCustomer ? (
              <CustomerInfo
                customer={customer}
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                setWarningMsg={setWarningMsg}
                isEditQuotation={isEditQuotation}
              />
            ) : (
              <OneTimeCustomerInfo
                isCODCustomer={isCODCustomer}
                oneTimeCustomerDetails={oneTimeCustomerDetails}
              />
            )
          }
        />
        <CardBody className="p-0">
          <ItemsTable />
        </CardBody>
        <CardFooter className="border-0">
          {isLoading ? (
            <>
              <small className="my-2 text-primary">Processing... &emsp;</small>
              <Spinner color="primary" className="reload-spinner" />
            </>
          ) : salesQuotationResponse?.docNum ? ( //&& customer?.U_CustomerType === customerTypes.B2B ?
            // Display this only when Crystal Report Sales Quotation Receipt is shown
            <Row className="text-right">
              <Col>
                <Button
                  color="primary"
                  onClick={resetSalesQuotationData}
                  className="btn-square"
                  size="lg"
                >
                  Start New
                </Button>
              </Col>
            </Row>
          ) : (
            !salesQuotationResponse?.docNum &&
            Array.isArray(salesQuotationItems) &&
            salesQuotationItems.length > 0 && (
              <Row className="text-center">
                <Col>
                  <Button
                    color="danger"
                    onClick={resetSalesQuotationData}
                    className="btn-square"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </Col>
                <Col>
                  {warningMsg && (
                    <DisplayMessage
                      type={statusColors.WARNING}
                      iconSize="text-sm"
                      message={warningMsg}
                    />
                  )}
                </Col>
                <Col className="mr-2">
                  <Button color="success" onClick={handleSubmit} className="btn-square" size="lg">
                    {isEditQuotation ? "Update" : "Submit"}
                  </Button>
                </Col>
              </Row>
            )
          )}
        </CardFooter>
      </Card>
    </>
  );
};

export default ItemSummary;
