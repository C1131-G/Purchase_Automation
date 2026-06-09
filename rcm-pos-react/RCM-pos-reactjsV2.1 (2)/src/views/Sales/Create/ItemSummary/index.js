import React, { useState, useContext, useEffect } from "react";
import {
  Row,
  Col,
  Button,
  Card,
  CardBody,
  CardFooter,
  Spinner,
  FormGroup,
  Input,
} from "reactstrap";
import HeaderCard from "../../../../components/Headers/HeaderCardSmall.js";
import ItemsTable from "./ItemsTable.jsx";
import CustomerInfo from "../../../components/POS/CustomerInfo.js";
import OneTimeCustomerInfo from "../../../components/POS/OneTimeCustomerInfo.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";
import PaymentMethodsModal from "./../Payment/";
import BatchSerialItemsModal from "../../../components/POS/BatchSerialItemsModal/index.js";
import PrintCrystalReport from "../../../components/PrintCrystalReport.js";
import InvoiceReceiptModel from "../../../components/POS/InvoiceReceiptModel.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./../context/SalesContext.js";
import { formatDate, getValidNumber } from "../../../../config/util.js";
import { createInvoice } from "../../../../helper/invoice.js";
import {
  getInvoiceSQRequest,
  getIncomingPaymentRequest,
  getSalesBatchSelection,
} from "../../../common-utils/prepare-payload.util.js";
import {
  getTotalTax as getTotalTaxUtil,
  roundPrice,
} from "../../../common-utils/calculations.util.js";
import {
  statusColors,
  customerTypes,
  portalModules,
  PAYMENT_METHODS,
  PRECISION,
  permissions,
  displayModes,
} from "../../../../config/config.js";
import { hasBatchSerialItems } from "../../../common-utils/item.util.js";
import { appPaths } from "../../../../config/config.js";
import { useHistory } from "react-router-dom";
import CustomModal from "../../../../components/CustomModal";
import { getCustomerInfo } from "../../../../helper/customer.js";

const ItemSummary = () => {
  const { userSessionLog, getLocationBasedDefaultCardCode, checkUserPermission } =
    useContext(UserPermissionsContext);
  const {
    customer,
    salesItems,
    setItem,
    resetItems,
    salesHeader,
    resetSalesHeader,
    clearSalesHeader,
    invoiceResponse,
    setInvoiceResponse,
    setSalesCustomer,
    isOneTimeCustomer,
    setIsOneTimeCustomer,
    isCODCustomer,
    setIsCODCustomer,
    customerAddress,
    setCustomerAddress,
    oneTimeCustomerDetails,
    setOneTimeCustomerDetails,
    cardPaymentInfo,
    setCardPaymentInfo,
    getTotalQuantity,
    getTaxableAmount,
    getTotalInvoiceAmount,
    paymentInfo,
    setPaymentInfo,
    handleParkTrx,
    timYardTransaction,
    setParkedTrans,
    getPaidAmount,
    taxProp,
    validateAllItemsStock,
    warningMsg,
    setWarningMsg,
    transactionId,
    setTransactionID,
  } = useContext(SalesContext);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openInvoiceReceiptModal, setInvoiceReceiptModal] = useState(false);
  const [openBatchSerialItemsModal, setOpenBatchSerialItemsModal] = useState(false);
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);

  const [paymentTypes, setPaymentTypes] = useState("");
  const [surcharge, setSurcharge] = useState("");
  const [change, setChange] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentAllowed, setIsPaymentAllowed] = useState(false);
  const [openReasonModal, setOpenReasonModal] = useState(false);
  const [parkReason, setParkReason] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [roundDiff, setRoundDiff] = useState(0);
  const [itemList, setItemList] = useState([]);
  const [timItemList, setTimItemList] = useState([]);
  const history = useHistory();
  const moduleName = portalModules.PAYMENT;

  useEffect(() => {
    if (!transactionId) generateNewTransactionID();
  }, []);

  const generateNewTransactionID = () => {
    const now = new Date();
    const newID = `POS_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    setTransactionID(newID);
  };

  const closeBatchSerialItemsModal = () => setOpenBatchSerialItemsModal(false);
  const handleSaveBatchSerial = (data) => {
    setItem(data);
    closeBatchSerialItemsModal();
    handleOpenPaymentModal();
  };
  const closePaymentModal = async () => {
    setPaidAmount(await getPaidAmount());
    setPaymentInfo({});
    setOpenPaymentModal(false);
  };
  const handleOpenPaymentModal = () => {
    setCardPaymentInfo([]);
    setOpenPaymentModal(true);
    setIsPaymentAllowed(checkUserPermission(moduleName, permissions.CREATE));
  };
  const toggleInvoiceReceiptModal = () => setInvoiceReceiptModal(!openInvoiceReceiptModal);
  const closeInvoiceReceiptModal = () => {
    setInvoiceReceiptModal(false);
    resetInvoiceData();
  };
  const closeDuplicateModal = () => setOpenDuplicateModal(false);

  const loadDefaultCustomer = () => {
    const getCustomer = async (cardCode) => {
      try {
        const info = await getCustomerInfo(cardCode);
        if (info) setOneTimeCustomerDetails({ ...oneTimeCustomerDetails, ...info[0] });
      } catch (err) {
        setWarningMsg(err);
      }
    };
    if (isOneTimeCustomer) {
      const code = getLocationBasedDefaultCardCode(isCODCustomer);
      if (code) getCustomer(code);
    }
  };

  const resetInvoiceData = () => {
    generateNewTransactionID();
    setIsOneTimeCustomer(true);
    setOneTimeCustomerDetails("");
    setIsCODCustomer(false);
    loadDefaultCustomer();
    setSalesCustomer({});
    setCustomerAddress("");
    resetSalesHeader();
    resetItems();
    setPaymentInfo({});
    setPaidAmount(0);
    setInvoiceResponse("");
    setWarningMsg("");
    clearSalesHeader();
    history.push(`${appPaths.CREATE_INVOICE}`);
  };

  const closeReasonModal = () => setOpenReasonModal(false);
  const handleOpenReasonModal = async () => {
    if (validateForm()) {
      const errs = await validateAllItemsStock();
      if (errs.length > 0) {
        setWarningMsg(errs[0]);
        return;
      }
      setWarningMsg("");
      setOpenReasonModal(true);
    }
  };

  const handleParkSubmit = () => {
    setOpenReasonModal(false);
    handleParkTrx();
    setParkReason("");
  };
  const handleOpenPayment = async () => {
    if (validateForm()) {
      const errs = await validateAllItemsStock();
      if (errs.length > 0) {
        setWarningMsg(errs[0]);
        return;
      }
      setWarningMsg("");
      if (hasBatchSerialItems(salesItems)) setOpenBatchSerialItemsModal(true);
      else handleOpenPaymentModal();
    }
  };

  const validateForm = () => {
    if (!isOneTimeCustomer && !customer?.CardCode) {
      setWarningMsg("Select a Customer!");
      return false;
    }
    if (!salesHeader?.SalesPersonCode || salesHeader.SalesPersonCode === -1) {
      setWarningMsg("Select Sales Employee.");
      return false;
    }
    if (!isOneTimeCustomer && !customerAddress) {
      setWarningMsg("Select Address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const cardCode = !isOneTimeCustomer
      ? customer.CardCode
      : getLocationBasedDefaultCardCode(isCODCustomer);
    const invoiceAmount = roundPrice(getTotalInvoiceAmount(PRECISION));
    const diffInvoiceAmount = parseFloat(invoiceAmount - getTotalInvoiceAmount(PRECISION)).toFixed(
      2,
    );

    const request = getInvoiceSQRequest(
      cardCode,
      invoiceAmount,
      salesHeader,
      salesItems,
      customerAddress,
      isCODCustomer,
      oneTimeCustomerDetails,
      userSessionLog.storeLocation,
      userSessionLog?.locationDefaults?.Branch,
      userSessionLog.counterName,
      userSessionLog.userName,
    );

    request.invoice.U_POS_TransactionID = transactionId;

    if (timYardTransaction && Object.keys(timYardTransaction).length > 0) {
      request.salesBatchSelection = getSalesBatchSelection(salesItems, timYardTransaction);
    } else {
      request.salesBatchSelection = [];
    }

    if (diffInvoiceAmount !== 0) setRoundDiff(diffInvoiceAmount);

    setCustomerName(
      isOneTimeCustomer
        ? oneTimeCustomerDetails.U_CODCntName || oneTimeCustomerDetails.CardName
        : customer.CardName,
    );
    setCustomerMobile(
      isOneTimeCustomer
        ? oneTimeCustomerDetails.U_CODTlePhone || oneTimeCustomerDetails.Cellular
        : customer.Cellular,
    );

    request.invoice.CompanyCode = process.env.REACT_APP_COMPANY_NAME;
    if (customerAddress.Address2) request.invoice.Address2 = customerAddress.Address2;

    if (getValidNumber(paymentInfo?.[PAYMENT_METHODS.Credit]?.amount) > 0) {
      request.invoice.U_PaymentType = PAYMENT_METHODS.Credit;
      setPaymentTypes(PAYMENT_METHODS.Credit);
    } else {
      const payAmt = await getPaidAmount();
      const changeVal = roundPrice(payAmt - getTotalInvoiceAmount(), 2);
      const { ipRequest, paymentTypes: pTypes } = getIncomingPaymentRequest(
        cardCode,
        invoiceAmount,
        payAmt,
        paymentInfo,
        userSessionLog.storeLocation,
        userSessionLog.counterName,
        userSessionLog.userName,
        userSessionLog?.locationDefaults?.Branch,
        changeVal,
        cardPaymentInfo,
      );

      const filtered = pTypes.filter((p) => p.amount > 0);
      request.invoice.U_PaymentType = filtered.map((p) => p.type).join(" + ");
      request.incomingPayment = ipRequest;
      if (cardPaymentInfo?.length > 0)
        request.invoice.U_CardType = cardPaymentInfo.map((p) => p.cardType).join(", ");
      setPaymentTypes(
        filtered.map((p) => `${p.type}: ${roundPrice(p.amount).toFixed(2)}`).join(" + "),
      );
      setSurcharge(cardPaymentInfo.reduce((s, i) => s + i.surchargeAmount, 0).toFixed(2));
      setChange(ipRequest.U_Change || "0.00");
    }

    try {
      const response = await createInvoice(request);
      if (response && response.DocNum) {
        closePaymentModal();
        setInvoiceResponse(response);
        setItemList(response.itemList?.itemsList || []);
        setTimItemList(response.timItemList?.itemsList || []);

        if (response.isExist) {
          setWarningMsg(`Duplicate Blocked! Invoice #${response.DocNum} retrieved.`);
          setOpenDuplicateModal(true);
        } else if (customer?.U_CustomerType !== customerTypes.B2B) {
          setInvoiceReceiptModal(true);
        }
      }
    } catch (err) {
      setWarningMsg(err.response?.data?.message || err.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow">
        <HeaderCard
          title={"Transaction"}
          className="border-0"
          rightContent={
            <div style={{ textAlign: "right" }}>
              {/* Transaction ID is hidden from here */}
              {invoiceResponse?.DocNum ? (
                <DisplayMessage
                  type={invoiceResponse.isExist ? statusColors.WARNING : statusColors.SUCCESS}
                  iconSize="text-sm"
                  message={
                    invoiceResponse.isExist
                      ? `Duplicate! Invoice #${invoiceResponse.DocNum}`
                      : `Invoice #${invoiceResponse.DocNum} created!`
                  }
                />
              ) : !isOneTimeCustomer ? (
                <CustomerInfo
                  customer={customer}
                  customerAddress={customerAddress}
                  setCustomerAddress={setCustomerAddress}
                  setWarningMsg={setWarningMsg}
                />
              ) : (
                <OneTimeCustomerInfo
                  isCODCustomer={isCODCustomer}
                  oneTimeCustomerDetails={oneTimeCustomerDetails}
                />
              )}
            </div>
          }
        />
        <CardBody className="p-0">
          <ItemsTable />
        </CardBody>
        <CardFooter className="border-0">
          {isLoading ? (
            <div className="text-center">
              <Spinner color="primary" />
            </div>
          ) : invoiceResponse?.DocEntry ? (
            <Row className="text-right">
              <Col>
                <Button color="primary" onClick={resetInvoiceData} className="btn-square" size="lg">
                  Start New
                </Button>
              </Col>
            </Row>
          ) : (
            salesItems.length > 0 && (
              <Row className="text-center">
                <Col>
                  <Button
                    color="danger"
                    onClick={resetInvoiceData}
                    className="btn-square"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </Col>
                <Col>
                  {warningMsg && (
                    <DisplayMessage type={statusColors.WARNING} message={warningMsg} />
                  )}
                </Col>
                <Col className="mr-2">
                  <Button
                    color="success"
                    onClick={handleOpenPayment}
                    className="btn-square"
                    size="lg"
                  >
                    {!checkUserPermission(moduleName, permissions.CREATE) &&
                    !isCODCustomer &&
                    isOneTimeCustomer
                      ? "Park to Payment"
                      : "Payment"}
                  </Button>
                </Col>
              </Row>
            )
          )}
        </CardFooter>
      </Card>

      {openBatchSerialItemsModal && (
        <BatchSerialItemsModal
          operation={displayModes.CREATE}
          itemsList={salesItems}
          isOpen={openBatchSerialItemsModal}
          storeLocation={userSessionLog.storeLocation}
          closeModal={closeBatchSerialItemsModal}
          handleSave={handleSaveBatchSerial}
          showQRCodeScanner={false}
        />
      )}
      <PaymentMethodsModal
        isOpen={openPaymentModal}
        closeModal={closePaymentModal}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        warningMsg={warningMsg}
        isPaymentAllowed={isPaymentAllowed}
      />

      <CustomModal
        isOpen={openDuplicateModal}
        title={"Duplicate Detected"}
        infoMessage={""}
        handleSubmit={closeDuplicateModal}
        closeModal={closeDuplicateModal}
      >
        <div className="text-center p-3">
          <i className="fa fa-exclamation-triangle text-warning fa-3x mb-3"></i>
          <h5>This invoice was already posted earlier.</h5>
          <h3 className="text-success">Invoice #{invoiceResponse?.DocNum}</h3>
          <p className="text-muted">Process blocked to prevent double charging.</p>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={openReasonModal}
        title={"Park Reason"}
        handleSubmit={handleParkSubmit}
        closeModal={closeReasonModal}
      >
        <Card className="shadow px-3 py-2">
          <FormGroup>
            <Input
              type="textarea"
              value={parkReason}
              onChange={(e) => {
                setParkReason(e.target.value);
                setParkedTrans("parkReason", e.target.value);
              }}
              placeholder="Reason"
            />
          </FormGroup>
        </Card>
      </CustomModal>

      {invoiceResponse?.DocEntry &&
        (customer?.U_CustomerType === customerTypes.B2B ? (
          <PrintCrystalReport
            moduleName={portalModules.INVOICE}
            docEntry={invoiceResponse.DocEntry}
            customerType={customerTypes.B2B}
            reportName={process.env.REACT_APP_SALES_INVOICE_CRT}
          />
        ) : (
          <InvoiceReceiptModel
            invoiceNo={invoiceResponse.DocNum}
            qrCode={invoiceResponse.qrCode || ""}
            companyName={userSessionLog.locationDefaults.U_LocName}
            companyAddress={userSessionLog.locationDefaults.U_LocAddress}
            companyStore={userSessionLog.locationDefaults.U_Store}
            companyPhone={userSessionLog.locationDefaults.U_Phone}
            companyWebsite={userSessionLog.locationDefaults.U_Website}
            companyEmail={userSessionLog.locationDefaults.U_Email}
            userName={localStorage.getItem("UserName")}
            invoiceCounter={invoiceResponse.InvCount ? invoiceResponse.InvCount : ""}
            sdcInvoiceNo={invoiceResponse.SDCInvNum ? invoiceResponse.SDCInvNum : ""}
            sdcTime={invoiceResponse.SDCTime ? invoiceResponse.SDCTime : ""}
            vehicleNo={invoiceResponse.VehicleNo ? invoiceResponse.VehicleNo : ""}
            isOpen={openInvoiceReceiptModal}
            closeModal={closeInvoiceReceiptModal}
            toggleModal={toggleInvoiceReceiptModal}
            invoiceType="============== FISCAL INVOICE =============="
            salesType="--------------- NORMAL SALES ----------------"
            endOfInvoice="======= END OF FISCAL INVOICE ========"
            callFrom="Invoice"
            posNo={userSessionLog.storeLocation}
            firstDate={formatDate(new Date(), "YYYY-MM-DD HH:mm:ss")}
            secondDate={formatDate(new Date(), "dddd DD/MM/YY hh:mm:ss")}
            user={userSessionLog.userName}
            cashierTIN={userSessionLog.userTIN}
            customerTIN={invoiceResponse.TradeNum ? invoiceResponse.TradeNum : ""}
            customerName={customerName}
            customerMobile={customerMobile}
            referenceNo=""
            terminal={userSessionLog.counterName}
            comments={salesHeader.Comments}
            documentLines={salesItems}
            totalQty={getTotalQuantity()}
            subTotal={getTaxableAmount()}
            tax={getTotalTaxUtil(itemList, taxProp)}
            totalAmount={roundPrice(getTotalInvoiceAmount())}
            roundOff={roundDiff}
            paidAmount={paidAmount}
            paymentType={paymentTypes}
            surcharge={surcharge}
            change={change}
            resetInvoiceData={resetInvoiceData}
            closeWithEsc={true}
          />
        ))}
    </>
  );
};

export default ItemSummary;
