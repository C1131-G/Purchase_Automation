import React, { useContext, useState, useEffect } from "react";
import { Col, Row } from "reactstrap";
import moment from "moment";

import ItemSummary from "./ItemSummary/index.js";
import SalesQuotationActions from "./SalesQuotationActions.js";
import SearchCustomers from "../../components/POS/SearchCustomers";
import ScanItems from "./ScanItems";
import SearchItems from "./SearchItems.js";
import AdditionalDetailsCard1 from "./AdditionalDetailsCards/Card1.js";
import AdditionalDetailsCard2 from "./AdditionalDetailsCards/Card2.js";
import AdditionalDetailsCard3 from "./AdditionalDetailsCards/Card3.js";
import AdditionalDetailsCard4 from "./AdditionalDetailsCards/Card4.js";
import CounterInfo from "../../components/POS/CounterInfo";
import DisplayMessage from "../../../components/DisplayMessage";
import ToastMessage from "../../../components/ToastMessage";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext.js";
import { SalesQuotationContext } from "./context/SalesQuotationContext.js";
import { getCustomerInfo } from "../../../helper/customer.js";

import {
  getNetUnitPrice,
  getTaxAmount,
  getTotalPrice,
  getDiscountAmount,
  getTaxAmountbyTotalPrice,
  getNetUnitPricebyRoundTotalPrice,
  getTaxAmountbyTotalGrossPrice,
  getNetUnitPricebyTotalPrice,
} from "../../../views/common-utils/calculations.util.js";
import {
  statusColors,
  DEFAULT_TAX_PERCENT,
  objectCodes,
  portalModules,
  TAX_PROPS,
  systemCurrency,
  TOTAL_AMT_PRECISION,
  isGrossPriceEnabled,
} from "../../../config/config.js";
import { useLocation } from "react-router-dom";
import queryString from "query-string";
import { round } from "config/util.js";

const Grid = () => {
  const { storeWHCode, getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);
  const {
    customer,
    setSalesQuotationCustomer,
    warehouseCode,
    setWarehouseCode,
    isCODCustomer,
    isOneTimeCustomer,
    setCustomerAddress,
    setSalesQuotationResponse,
    oneTimeCustomerDetails,
    setOneTimeCustomerDetails,
    setIsOneTimeCustomer,
    taxProp,
    setTaxProp,
    setIsCODCustomer,
    setBulkSalesQuotationHeaders,
    setBulkSalesQuotationHeaderFields,
    setBulkSalesQuotationItem,
    isEditQuotation,
    setEditQuotation,
  } = useContext(SalesQuotationContext);

  //const { operation, paymentTerm, postingDate, expiryDate } = this.state;
  const location = useLocation();
  const [itemCode, setItemCode] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [currency, setCurrency] = useState(systemCurrency); // If required, change this via `props`
  const [cardCode, setCardCode] = useState("");

  // Block manual search and selection of COD or One-Time Customer
  const setCustomer = (customer) => {
    if (customer.U_OneTimeCustomer === "Y") {
      // setIsOneTimeCustomer(true); DIDN'T open the OTC, COD Popup
      setWarningMsg(
        "One-Time Customer cannot be selected manually! Use the popup to enter the details.",
      );
    } else if (customer.U_COD === "Y") {
      // setIsOneTimeCustomer(true); //DIDN'T open the OTC, COD Popup
      // setIsCODCustomer(true);
      setWarningMsg(
        "COD Customer cannot be selected manually! Use the popup to enter the details.",
      );
    } else {
      setSalesQuotationCustomer(customer);
    }
  };

  useEffect(() => {
    if (!isEditQuotation) {
      if (isCODCustomer || isOneTimeCustomer) {
        setCardCode(getLocationBasedDefaultCardCode(isCODCustomer));
      } else {
        setCardCode(customer.CardCode);
      }
    }
  }, [customer, isCODCustomer, isOneTimeCustomer]);

  useEffect(() => {
    setWarehouseCode(storeWHCode);
  }, [storeWHCode]);

  // useEffect(() => {
  //   const queryParams = queryString.parse(location.search);
  //   if (location.search) {
  //     const header = JSON.parse(queryParams.header || '{}');
  //     const itemRecords = JSON.parse(queryParams.itemRecords || '[]');
  //     setEditQuotation(true)  //set the operation state as Edit
  //     handleHeaderFields(header);
  //     const updatedItems = handlePriceDetails(itemRecords, taxProp);
  //     setBulkSalesQuotationItem(updatedItems);
  //   }
  // }, [location.search, taxProp]);

  useEffect(() => {
    if (location.state) {
      const { header, itemRecords } = location.state;

      setEditQuotation(true); // Set the operation state as Edit
      handleHeaderFields(header);
      const updatedItems = handlePriceDetails(itemRecords, taxProp);
      setBulkSalesQuotationItem(updatedItems);
    }
  }, [location.state, taxProp]);

  const getCustomer = async (cardCode) => {
    try {
      const customerInfo = await getCustomerInfo(cardCode);
      if (customerInfo) {
        const {
          CardCode,
          CardName,
          CreditLimit,
          AvailableBalance,
          SalesEmployeeCode,
          U_OneTimeCustomer,
          U_COD,
        } = customerInfo[0];

        console.log(
          "CardCode, CardName, CreditLimit, AvailableBalance, SalesEmployeeCode",
          CardCode + CardName + CreditLimit + AvailableBalance + SalesEmployeeCode,
        );

        setSalesQuotationCustomer({
          CardCode: CardCode,
          CardName: CardName,
          CreditLimit: CreditLimit,
          AvailableBalance: AvailableBalance,
          SalesEmployeeCode: SalesEmployeeCode,
          U_OneTimeCustomer: U_OneTimeCustomer,
          U_COD: U_COD,
          label: `${CardCode} - ${CardName}`,
        });
        // Set COD/OTC flags
        setIsOneTimeCustomer(U_OneTimeCustomer === "Y");
        setIsCODCustomer(U_COD === "Y");
        setCardCode(CardCode);
        setCustomer(customerInfo[0]);
      }
    } catch (err) {
      setWarningMsg(err);
    }
  };

  const handleHeaderFields = async (header) => {
    //Transfer header data

    setSalesQuotationCustomer(
      header.CardCode ? { CardCode: header.CardCode, CardName: header.CardName } : {},
    );
    setCustomerAddress({ Address2: header.ShipTo });

    setBulkSalesQuotationHeaderFields({
      NumAtCard: header.NumAtCard,
      Comments: header.Comments,
      SalesPersonCode: header.SalesPersonCode,
      customerContact: header.ContactPersonCode,
      paymentTerm: header.PaymentTermCode,
      expiryDate: moment(header.DocDueDate).format("MMMM D, YYYY"),
      DocEntry: header.DocEntry,
      DocNum: header.DocNum,
    });

    // This method must be called at the last
    setIsOneTimeCustomer(header.U_CODCntName ? true : false);
    setIsCODCustomer(header.U_CODAddress ? true : false);
    setOneTimeCustomerDetails({
      ...oneTimeCustomerDetails,
      U_CODCntName: header.U_CODCntName,
      U_CODTlePhone: header.U_CODTlePhone,
      U_Location: header.U_Location,
      U_CODEmail: header.U_CODEmail,
    });
  };
  const handlePriceDetails = (itemRecords, taxProp) => {
    let updatedItems = [];
    itemRecords.map((item, key) => {
      console.log("item", item);

      const taxAmount = round(
        getTaxAmountbyTotalPrice(item.PriceBeforDiscount, DEFAULT_TAX_PERCENT),
        TOTAL_AMT_PRECISION,
      );

      const priceBeforeDis = isGrossPriceEnabled
        ? round(Number(item.PriceBeforDiscount) + Number(taxAmount), 2)
        : item.PriceBeforDiscount;
      console.log("priceBeforeDis", priceBeforeDis);
      const priceAfterVat = getTotalPrice(1, priceBeforeDis, item.DiscountPercent);
      console.log("priceAfterVat", priceAfterVat);
      // Calc. the Tax & Total Price based on the Qty
      const totalPrice = round(
        getTotalPrice(item.Quantity, priceBeforeDis, item.DiscountPercent),
        TOTAL_AMT_PRECISION,
      );
      const netUnitPrice = isGrossPriceEnabled
        ? getNetUnitPricebyTotalPrice(priceBeforeDis, item.DiscountPercent, 0)
        : getNetUnitPricebyRoundTotalPrice(
            priceBeforeDis,
            item.DiscountPercent,
            DEFAULT_TAX_PERCENT,
          );
      const discountAmount = getDiscountAmount(
        item.Quantity,
        priceBeforeDis,
        item.DiscountPercent,
        item.TaxPercent,
      );

      const newItem = {
        ItemCode: item.ItemCode,
        ItemName: item.ItemName,
        Quantity: item.Quantity,
        Price: priceBeforeDis,
        Discount: item.DiscountPercent,
        VatGroup: item.VatGroup,
        TaxPercent: item.TaxPercent,
        DiscountAmount: discountAmount,
        MeasureUnit: item.UomCode,
        FreeText: item.FreeText,
        WhsCode: item.WhsCode, //storeWHCode,
        NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
        [taxProp]: taxAmount,
        ItmsGrpName: item.ItmsGrpName,
        ItmsGrpCod: item.ItmsGrpCod,
        ManSerNum: item.ManSerNum,
        ManBtchNum: item.ManBtchNum,
        //TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount, // Total Price after Discount & Tax
        // Add current recs. `LineNum` during Edit op.
        LineNum: item.LineNum,
        DocNum: item.DocNum, // Pass DocNum if available
        FCCCItem: item.FCCCItem,
        DiscApplied: item.DiscApplied,
      };
      setWarehouseCode(item.WhsCode);

      newItem.TotalPrice = totalPrice;
      newItem.TotalPriceWithTax = isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount; // Total Price after Discount & Tax
      updatedItems.push(newItem);
    });
    return updatedItems;
  };

  // Set Tax Prop based on the currency
  useEffect(() => {
    if (currency === systemCurrency) setTaxProp(TAX_PROPS.TaxLocal);
    else setTaxProp(TAX_PROPS.TaxForeign);
  }, []);

  return (
    <Col md="12" className="box-col-8 grid-ed-12">
      <Row>
        <Col md="12">
          <Row>
            <Col md="3" className="mb-3 mr--1">
              <SearchCustomers
                setCustomer={setCustomer}
                setInvoiceResponse={setSalesQuotationResponse}
                setOneTimeCustomer={setOneTimeCustomerDetails}
                setIsOneTimeCustomer={setIsOneTimeCustomer}
                isDisabled={isEditQuotation}
              />
            </Col>
            <Col md="3" className="mr--1">
              <AdditionalDetailsCard1 setWarningMsg={setWarningMsg} />
            </Col>
            <Col md="3" className="mr-1 pr-0">
              <AdditionalDetailsCard2 setWarningMsg={setWarningMsg} />
            </Col>
            <Col md="3" className="pr-1">
              <CounterInfo />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col md="3" className="mr--1">
          <ScanItems
            warehouseCode={warehouseCode}
            itemCode={itemCode}
            cardCode={cardCode}
            setItemCode={setItemCode}
            setWarningMsg={setWarningMsg}
          />
        </Col>
        <Col md="6" className="mr-1 pr-1">
          <SearchItems
            warehouseCode={warehouseCode}
            itemCode={itemCode}
            cardCode={cardCode}
            setItemCode={setItemCode}
            setWarningMsg={setWarningMsg}
          />
        </Col>
        <Col md="3" className="pl-1">
          <AdditionalDetailsCard3 setWarningMsg={setWarningMsg} />
        </Col>
      </Row>
      <Row>
        <Col md="12" className="pl-1">
          <AdditionalDetailsCard4 setWarningMsg={setWarningMsg} />
        </Col>
      </Row>
      <Row>
        <Col md="10" className="text-center">
          {customer?.U_Fin_Status === "N" ? (
            <DisplayMessage
              className="h3"
              type={statusColors.WARNING}
              iconSize={"md"}
              message={"Customer is Financially Inactive. Sales Quotation cannot be created!"}
            />
          ) : (
            <ItemSummary />
          )}
        </Col>
        <Col md="2">
          <SalesQuotationActions />
        </Col>
      </Row>
      <Row>
        {/* Temporarily hiding for demo */}
        {/* <Col md="6" className="box-col-12">
          <Payment />
        </Col>
      
        <Col md="12">
          <CashDrawerActions />
        </Col> */}

        {/* <Col xxl="3" md="6" className="box-col-6">
          <MonthlyProfits />
        </Col> */}
      </Row>
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </Col>
  );
};

export default Grid;
