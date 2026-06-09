import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardHeader, CardFooter, Spinner } from "reactstrap";
import HeaderCardWithSubtitle from "../../../../components/Headers/HeaderCardWithSubtitle";
import ItemsTable from "./ItemsTable.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";

import { ViewSalesQuotationContext } from "../context/ViewSalesQuotationContext.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";

import { getSalesQuotationItems, getSalesQuotation } from "../../../../helper/sales-quotation";
import { statusColors, portalModules } from "../../../../config/config.js";
import PrintCrystalReport from "../../../components/PrintCrystalReport.js";
import { appPaths } from "../../../../config/config.js";
import { useHistory } from "react-router-dom";
import queryString from "query-string";

const ItemSummary = () => {
  const { selectedRecord, resetItems, setSelectedRecord, setSalesQuotationItems, items } =
    useContext(ViewSalesQuotationContext);

  const [warningMsg, setWarningMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const history = useHistory();

  const handleCancel = () => {
    resetItems();
    setSelectedRecord("");
    setWarningMsg("");
  };

  useEffect(() => {
    const fetchItems = async (docNum) => {
      setIsLoading(true);
      try {
        const items = await getSalesQuotationItems("", { docNum });
        setSalesQuotationItems(items?.itemsList);
      } catch (err) {
        setWarningMsg(err?.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (selectedRecord.DocNum) {
      fetchItems(selectedRecord.DocNum);
    }
  }, [selectedRecord, selectedRecord?.DocNum]);

  const handleCreateInvoice = () => {
    console.log("Transfer SQ to Inv");
    // Encode data into URL parameters
    history.push({
      pathname: appPaths.CREATE_INVOICE,
      state: {
        header: selectedRecord,
        itemRecords: items,
      },
    });
  };

  // const handleEdit = () => {
  //   console.log("Edit SQ")

  //   // Encode data into URL parameters
  //   const queryParams = queryString.stringify({
  //     header: JSON.stringify(selectedRecord),
  //     itemRecords: JSON.stringify(items)
  //   });
  //   history.push(`${appPaths.CREATE_QUOTATION}?${queryParams}`);
  // }

  const handleEdit = () => {
    history.push({
      pathname: appPaths.CREATE_QUOTATION,
      state: {
        header: selectedRecord,
        itemRecords: items,
      },
    });
  };

  const rightContent = (
    <>
      <Button color="primary" onClick={handleEdit} className="ml-3" size="md">
        Edit
      </Button>
      <PrintCrystalReport
        className="ml-3"
        moduleName={portalModules.SALES_QUOTATION}
        docEntry={selectedRecord.DocEntry}
        reportName={process.env.REACT_APP_SALES_QUOTATION_CRT}
        buttonType={"button"}
        buttonName={"A4 Print"}
        size="md"
      />
    </>
  );

  return (
    <>
      <Card className="shadow">
        {/* <HeaderCard title={"Items"} className="border-0" rightContent={
          selectedRecord?.DocNum &&
          <h4 className="ml-2 font-weight-700">
            Returns# <span className="text-primary">{selectedRecord.DocNum}</span>
          </h4>
        } /> */}
        <div className="pb-1">
          <HeaderCardWithSubtitle
            title={`Sales Quotation# ${selectedRecord.DocNum}`}
            subTitle={"Items present in the Sales Quotation."}
            rightContent={rightContent}
          />
        </div>
        <CardBody className="p-0">
          <ItemsTable />
        </CardBody>
        <CardFooter className="border-0">
          {isLoading ? (
            <>
              <small className="my-2 text-primary">Processing... &emsp;</small>
              <Spinner color="primary" className="reload-spinner" />
            </>
          ) : (
            <Row className="text-left">
              <Col>
                <Button color="danger" onClick={handleCancel} className="btn-square" size="lg">
                  Back
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
              <Col className="mr-2 text-right">
                <Button
                  color="success"
                  onClick={handleCreateInvoice}
                  className="btn-square"
                  size="lg"
                >
                  Create Invoice
                </Button>
              </Col>
            </Row>
          )}
        </CardFooter>
      </Card>
    </>
  );
};

export default ItemSummary;
