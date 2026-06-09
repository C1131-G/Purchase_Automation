import React, { useContext, useState, useEffect } from "react";
import { Col, Row } from "reactstrap";

import ItemSummary from "./ItemSummary/index.js";
import SalesActions from "./SalesActions";
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
import { getCustomerInfo } from "../../../helper/customer.js";
import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./context/SalesContext";

import {
  statusColors,
  DEFAULT_TAX_PERCENT,
  objectCodes,
  portalModules,
  TAX_PROPS,
  systemCurrency,
  TOTAL_AMT_PRECISION,
  isHomeDeliveryEnabled,
  isGrossPriceEnabled,
  PRECISION,
  timYardItemGroups,
} from "../../../config/config.js";
import { useLocation } from "react-router-dom";
import queryString from "query-string";
import { round } from "config/util.js";
import { getBinCodeInfo } from "helper/items-helper.js";

const Grid = () => {
  const { userSessionLog, storeWHCode, getLocationBasedDefaultCardCode } =
    useContext(UserPermissionsContext);
  const {
    customer,
    setSalesCustomer,
    warehouseCode,
    setWarehouseCode,
    oneTimeCustomerDetails,
    taxProp,
    setTaxProp,
    isCODCustomer,
    isOneTimeCustomer,
    setCustomerAddress,
    setIsEditQuotation,
    setInvoiceResponse,
    setOneTimeCustomerDetails,
    setIsOneTimeCustomer,
    setIsCODCustomer,
    sqDocNum,
    setSQDocNum,
    setSalesHeader,
    setBulkSalesHeaders,
    setBulkSalesItem,
    isEditQuotaion,
    setBulkOneTimeCustomerDetails,
  } = useContext(SalesContext);

  const [itemCode, setItemCode] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [currency, setCurrency] = useState(systemCurrency); // If required, change this via `props`
  const [cardCode, setCardCode] = useState("");
  const location = useLocation();

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
      setSalesCustomer(customer);
    }
  };
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
          LicTradNum,
        } = customerInfo[0];
        if (U_OneTimeCustomer === "Y") {
          setIsOneTimeCustomer(true);
        } else if (U_COD === "Y") {
          setIsCODCustomer(true);
        } else {
          setIsOneTimeCustomer(false);
          setIsCODCustomer(false);
        }

        // Add Cust. Name, Credit Limit & Available Bal. to OTC
        setSalesCustomer({
          CardCode: CardCode,
          CardName: CardName,
          CreditLimit: CreditLimit,
          AvailableBalance: AvailableBalance,
          SalesEmployeeCode: SalesEmployeeCode,
          U_OneTimeCustomer: U_OneTimeCustomer,
          U_COD: U_COD,
          LicTradNum: LicTradNum,
        });
      }
    } catch (err) {
      setWarningMsg(err);
    }
  };

  const handleHeaderFields = async (header) => {
    //Transfer header data
    setCustomer(header.CardCode ? { CardCode: header.CardCode, CardName: header.CardName } : {});
    setCustomerAddress({ Address2: header.ShipTo });
    //Set Header data
    setBulkSalesHeaders({
      NumAtCard: header.NumAtCard,
      Comments: header.Comments,
      SalesPersonCode: header.SalesPersonCode,
    });

    //Set OTC data
    setIsCODCustomer(
      header.CardCode === userSessionLog.locationDefaults.U_CODCardCode ? true : false,
    );
    setBulkOneTimeCustomerDetails({
      U_CODCntName: header.U_CODCntName,
      U_CODTlePhone: header.U_CODTlePhone,
      U_Location: header.U_Location,
      U_CODEmail: header.U_CODEmail,
      U_CODAddress: header.U_CODAddress,
    });
    setSQDocNum(header.DocNum || "");
    // This method must be called at the last
    setIsOneTimeCustomer(
      header.CardCode === userSessionLog.locationDefaults.U_OTCCardCode ? true : false,
    );
  };

  useEffect(() => {
    if (isCODCustomer || isOneTimeCustomer) {
      setCardCode(getLocationBasedDefaultCardCode(isCODCustomer));
    } else {
      setCardCode(customer.CardCode);
    }
  }, [customer, isCODCustomer, isOneTimeCustomer]);

  // useEffect(() => {
  //   const queryParams = queryString.parse(location.search);
  //   if (location.search) {
  //     const header = JSON.parse(queryParams.header || '{}');
  //     const itemRecords = JSON.parse(queryParams.itemRecords || '[]');
  //     handleHeaderFields(header);
  //     const updatedItems = handlePriceDetails(itemRecords, taxProp);
  //     setBulkSalesItem(updatedItems);
  //   }
  // }, [location.search, taxProp]);

  useEffect(() => {
    const loadDetail = async () => {
      if (location.state) {
        const { header, itemRecords } = location.state;

        //setEditQuotation(true); // Set the operation state as Edit
        setIsEditQuotation(true); // Set the operation state as Edit
        handleHeaderFields(header);
        const updatedItems = await handlePriceDetails(itemRecords, taxProp);
        setBulkSalesItem(updatedItems);
      }
    };
    loadDetail();
  }, [location.state, taxProp]);

  // const handlePriceDetails = async(itemRecords, taxProp) => {
  //   const updatedItems = await Promise.all(
  //   itemRecords.map(async(item, key) => {
  //     // Calc. the Tax & Total Price based on the Qty
  //   console.log("item", item)
  //     const binInfo = await getBinCodeInfo(item.WhsCode, item.ItemCode);
  //     const taxAmount = round(getTaxAmountbyTotalPrice(item.PriceBeforDiscount, DEFAULT_TAX_PERCENT), TOTAL_AMT_PRECISION);
  //     const priceBeforeDis = isGrossPriceEnabled ? round(Number(item.PriceBeforDiscount) + Number(taxAmount), 2) : item.PriceBeforDiscount;
  //     const totalPrice = round(getTotalPrice(item.Quantity, priceBeforeDis, item.DiscountPercent), TOTAL_AMT_PRECISION);
  //     const priceAfterVat = getTotalPrice(1, priceBeforeDis, item.DiscountPercent);
  //     // Use the TaxAmount from the backend if it exists or calculate the tax amount the selected item
  //     // const taxAmount = item.TaxAmount ? item.TaxAmount :
  //     //                     isGrossPriceEnabled ? getTaxAmountbyTotalGrossPrice(item.PriceBeforDiscount, DEFAULT_TAX_PERCENT)
  //     //                     : round(getTaxAmountbyTotalPrice(totalPrice, DEFAULT_TAX_PERCENT), TOTAL_AMT_PRECISION);
  //     const netUnitPrice = isGrossPriceEnabled ? getNetUnitPricebyTotalPrice(priceBeforeDis, item.DiscountPercent, 0)
  //                               : getNetUnitPricebyRoundTotalPrice(priceBeforeDis, item.DiscountPercent, DEFAULT_TAX_PERCENT);
  //     const discountAmount = getDiscountAmount(item.Quantity, priceBeforeDis, item.DiscountPercent, item.TaxPercent);

  //     const newItem = {
  //       ItemCode: item.ItemCode,
  //       ItemName: item.ItemName,
  //       Quantity: item.Quantity,
  //       Price: priceBeforeDis,
  //       Discount: item.DiscountPercent,
  //       VatGroup: item.VatGroup,
  //       TaxPercent: item.TaxPercent,
  //       DiscountAmount: discountAmount,
  //       MeasureUnit: item.UomCode,
  //       WhsCode: item.WhsCode, //storeWHCode,
  //       NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
  //       [taxProp]: taxAmount,
  //       ItmsGrpName: item.ItmsGrpName,
  //       ItmsGrpCod: item.ItmsGrpCod,
  //       ManBtchNum: item.ManBtchNum,
  //       ManSerNum: item.ManSerNum,
  //       BinCode: binInfo?.BinCode,
  //       BinAbsEntry: binInfo?.BinAbsEntry,
  //       // Set Base rec. details
  //       BaseEntry: item.DocEntry,
  //       BaseType:  objectCodes[portalModules.SALES_QUOTATION],
  //       BaseLine: item.LineNum,
  //       DocNum: item.DocNum || "",
  //     };
  //     setWarehouseCode(item.WhsCode);
  //     newItem.TotalPrice = totalPrice;
  //     newItem.TotalPriceWithTax = isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount;
  //     //updatedItems.push(newItem)
  //     return newItem; // ✅ MUST return here
  //   })
  //   )
  //   return updatedItems;
  // }

  const handlePriceDetails = async (itemRecords, taxProp) => {
    const updatedItems = await Promise.all(
      itemRecords.map(async (item) => {
        console.log("item", item);

        const binInfo = await getBinCodeInfo(item.WhsCode, item.ItemCode);

        const taxAmount = round(
          getTaxAmountbyTotalPrice(item.PriceBeforDiscount, DEFAULT_TAX_PERCENT),
          TOTAL_AMT_PRECISION,
        );
        const priceBeforeDis = isGrossPriceEnabled
          ? round(Number(item.PriceBeforDiscount) + Number(taxAmount), 2)
          : item.PriceBeforDiscount;
        const totalPrice = round(
          getTotalPrice(item.Quantity, priceBeforeDis, item.DiscountPercent),
          TOTAL_AMT_PRECISION,
        );
        const priceAfterVat = getTotalPrice(1, priceBeforeDis, item.DiscountPercent);
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

        setWarehouseCode(item.WhsCode);

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
          WhsCode: item.WhsCode,
          NetUnitPrice: netUnitPrice,
          [taxProp]: taxAmount,
          ItmsGrpName: item.ItmsGrpName,
          ItmsGrpCod: item.ItmsGrpCod,
          ManBtchNum: item.ManBtchNum,
          ManSerNum: item.ManSerNum,
          BinCode: binInfo?.BinCode,
          BinAbsEntry: binInfo?.BinAbsEntry,
          BaseEntry: item.DocEntry,
          BaseType: objectCodes[portalModules.SALES_QUOTATION],
          BaseLine: item.LineNum,
          DocNum: item.DocNum || "",
          TotalPrice: totalPrice,
          TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount,
          FCCCItem: item.FCCCItem,
          DiscApplied: item.DiscApplied,
        };

        return newItem; // MUST return here
      }),
    );

    return updatedItems;
  };

  // Set Tax Prop based on the currency
  useEffect(() => {
    if (currency === systemCurrency) setTaxProp(TAX_PROPS.TaxLocal);
    else setTaxProp(TAX_PROPS.TaxForeign);
  }, []);

  useEffect(() => {
    setWarehouseCode(storeWHCode);
  }, [storeWHCode]);

  return (
    <Col md="12" className="box-col-8 grid-ed-12">
      <Row>
        <Col md="12">
          <Row>
            <Col md="3" className="mb-3 mr--1">
              <SearchCustomers
                setCustomer={setCustomer}
                setInvoiceResponse={setInvoiceResponse}
                setOneTimeCustomer={setOneTimeCustomerDetails}
                setIsOneTimeCustomer={setIsOneTimeCustomer}
                //isDisabled={isEditQuotation}
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
      {isHomeDeliveryEnabled && isCODCustomer && (
        <Row>
          <Col md="12" className="pl-1">
            <AdditionalDetailsCard4 setWarningMsg={setWarningMsg} />
          </Col>
        </Row>
      )}
      <Row>
        <Col md="10" className="text-center">
          {customer?.U_Fin_Status === "N" ? (
            <DisplayMessage
              className="h3"
              type={statusColors.WARNING}
              iconSize={"md"}
              message={"Customer is Financially Inactive. Invoice cannot be created!"}
            />
          ) : (
            <ItemSummary />
          )}
        </Col>
        <Col md="2">
          <SalesActions setWarningMsg={setWarningMsg} />
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
