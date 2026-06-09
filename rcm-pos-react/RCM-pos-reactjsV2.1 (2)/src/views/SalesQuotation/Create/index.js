import React, { useState, useEffect, useContext } from "react";
import { Container, Col, Row } from "reactstrap";
// import { Breadcrumbs } from '../../AbstractElements';
import CounterSelectionModal from "../../components/CounterSelectionModal";
import Grid from "./Grid";
import { SalesQuotationProvider } from "./context/SalesQuotationContext";
import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";
import { portalModules, permissions } from "../../../config/config";

const SalesQuotation = () => {
  const title = "Sales Quotation";
  const moduleName = portalModules.SALES_QUOTATION;

  const { checkUserPermission, userSessionLog } = useContext(UserPermissionsContext);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SalesQuotationProvider>
      {/* <Breadcrumbs mainTitle={title} parent='POS' title={title} /> */}
      <Container fluid={true}>
        <Row className="size-column">
          {checkUserPermission(moduleName, permissions.CREATE) ? (
            userSessionLog && userSessionLog.storeCounterId ? ( //isCounterSelected
              <Grid />
            ) : (
              //Open the modal when the current user hasn't selected a `counter` yet
              <CounterSelectionModal isOpen={!(userSessionLog && userSessionLog.storeCounterId)} />
            )
          ) : (
            <Col>
              <h4 className="mb-4 pb-2 text-center text-warning">
                You don't have authorization to access this content. Contact Admin!
              </h4>
            </Col>
          )}
        </Row>
      </Container>
    </SalesQuotationProvider>
  );
};

export default SalesQuotation;
