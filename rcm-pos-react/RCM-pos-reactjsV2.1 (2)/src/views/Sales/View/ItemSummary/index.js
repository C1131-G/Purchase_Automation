import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardFooter, Spinner } from "reactstrap";
import HeaderCardWithSubtitle from "../../../../components/Headers/HeaderCardWithSubtitle";
import ItemsTable from "./ItemsTable.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";
import { formatDate } from "../../../../config/util.js";
import { ViewSalesContext } from "./../context/ViewSalesContext.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { getInvoiceItems } from "../../../../helper/invoice.js";
import { statusColors, portalModules } from "../../../../config/config.js";
import InvoiceReceiptModel from "../../../components/POS/InvoiceReceiptModel.js";
import { roundPrice } from "views/common-utils/calculations.util.js";
import PrintCrystalReport from "../../../components/PrintCrystalReport.js";

const ItemSummary = () => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const {
    selectedRecord,
    resetItems,
    setSelectedRecord,
    items,
    setInvoiceItems,
    getTotalQuantity,
    getTaxableAmount,
    getTotalTax,
    getTotalInvoiceAmount,
  } = useContext(ViewSalesContext);

  const [warningMsg, setWarningMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openInvoiceReceiptModal, setInvoiceReceiptModal] = useState(false);
  const [fircaResponse, setFircaResponse] = useState("");
  const [timItemList, setTimItemList] = useState([]);

  const handleCancel = () => {
    resetItems();
    setSelectedRecord("");
    setWarningMsg("");
  };

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const result = await getInvoiceItems(selectedRecord.DocNum);
        setInvoiceItems(result?.itemsList);
      } catch (err) {
        setWarningMsg(err?.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (selectedRecord.DocNum) {
      fetchItems();
    }
  }, [selectedRecord, selectedRecord?.DocNum, setInvoiceItems]);

  // FIX: Manual bypass for Thermal Reprint to avoid 500 error
  const handleReprint = () => {
    setFircaResponse({});
    setTimItemList([]);
    setInvoiceReceiptModal(true);
  };

  const toggleInvoiceReceiptModal = () => {
    setInvoiceReceiptModal(!openInvoiceReceiptModal);
  };

  const closeInvoiceReceiptModal = () => {
    setInvoiceReceiptModal(false);
    handleCancel();
  };

  const rightContent = (
    <>
      {selectedRecord?.U_IsReprinted === "N" && (
        <>
          <Button color="primary" onClick={handleReprint} className="ml-3" size="md">
            Reprint copy
          </Button>

          <PrintCrystalReport
            className="ml-3"
            moduleName={portalModules.INVOICE}
            docEntry={selectedRecord.DocEntry}
            reportName={process.env.REACT_APP_SALES_INVOICE_CRT}
            buttonType={"button"}
            buttonName={"A4 Print"}
            size="md"
          />
        </>
      )}
    </>
  );

  return (
    <>
      <Card className="shadow">
        <div className="pb-1">
          <HeaderCardWithSubtitle
            title={`Invoice# ${selectedRecord.DocNum}`}
            subTitle={"Items present in the invoice."}
            rightContent={rightContent}
          />
        </div>
        <CardBody className="p-0">
          <ItemsTable />
        </CardBody>
        <CardFooter className="border-0">
          {isLoading ? (
            <div className="text-center">
              <Spinner color="primary" />
            </div>
          ) : (
            <Row>
              <Col>
                <Button color="info" onClick={handleCancel} size="lg">
                  Back
                </Button>
              </Col>
              <Col>
                {warningMsg && <DisplayMessage type={statusColors.WARNING} message={warningMsg} />}
              </Col>
            </Row>
          )}
        </CardFooter>
      </Card>

      {selectedRecord && (
        <InvoiceReceiptModel
          invoiceNo={selectedRecord.DocNum}
          qrCode={""}
          companyName={userSessionLog.locationDefaults?.U_LocName}
          companyAddress={userSessionLog.locationDefaults?.U_LocAddress}
          companyStore={userSessionLog.locationDefaults?.U_Store}
          companyPhone={userSessionLog.locationDefaults?.U_Phone}
          isOpen={openInvoiceReceiptModal}
          closeModal={closeInvoiceReceiptModal}
          toggleModal={toggleInvoiceReceiptModal}
          invoiceType="======= THIS IS NOT A FISCAL INVOICE ======="
          salesType="---------------- COPY SALE -----------------"
          callFrom="ViewInvoice"
          posNo={userSessionLog.storeLocation}
          firstDate={formatDate(new Date(), "YYYY-MM-DD HH:mm:ss")}
          secondDate={formatDate(new Date(), "dddd DD/MM/YY hh:mm:ss")}
          user={userSessionLog.userName}
          customerName={selectedRecord.U_CODCntName || selectedRecord.CardName}
          documentLines={items}
          totalQty={getTotalQuantity()}
          subTotal={getTaxableAmount()}
          tax={getTotalTax()}
          totalAmount={roundPrice(getTotalInvoiceAmount())}
          timItemList={timItemList}
          paymentType={selectedRecord.U_PaymentType}
          change={selectedRecord.Change || "0.00"}
          resetInvoiceData={handleCancel}
        />
      )}
    </>
  );
};

export default ItemSummary;
