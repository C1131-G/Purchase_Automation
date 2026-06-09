import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardHeader, CardFooter, Spinner } from "reactstrap";
import HeaderCardWithSubtitle from "../../../../components/Headers/HeaderCardWithSubtitle";
import ItemsTable from "./ItemsTable.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";

import { ReturnsContext } from "./../context/ReturnsContext.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";

import { getCreditMemoItems } from "../../../../helper/credit-memo.js";
import { statusColors } from "../../../../config/config.js";

const ItemSummary = () => {
  const { selectedReturns, resetItems, setSelectedReturns, setReturnsItems } =
    useContext(ReturnsContext);

  const [warningMsg, setWarningMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = () => {
    resetItems();
    setSelectedReturns("");
    setWarningMsg("");
  };

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const items = await getCreditMemoItems(selectedReturns.DocNum);
        setReturnsItems(items?.itemsList);
      } catch (err) {
        setWarningMsg(err?.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (selectedReturns.DocNum) {
      fetchItems();
    }
  }, [selectedReturns, selectedReturns?.DocNum]);

  return (
    <>
      <Card className="shadow">
        {/* <HeaderCard title={"Items"} className="border-0" rightContent={
          selectedReturns?.DocNum &&
          <h4 className="ml-2 font-weight-700">
            Returns# <span className="text-primary">{selectedReturns.DocNum}</span>
          </h4>
        } /> */}
        <div className="pb-1">
          <HeaderCardWithSubtitle
            title={`Returns# ${selectedReturns.DocNum}`}
            subTitle={"Items that were returned via this request."}
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
                <Button color="info" onClick={handleCancel} className="btn-square" size="lg">
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
            </Row>
          )}
        </CardFooter>
      </Card>
    </>
  );
};

export default ItemSummary;
