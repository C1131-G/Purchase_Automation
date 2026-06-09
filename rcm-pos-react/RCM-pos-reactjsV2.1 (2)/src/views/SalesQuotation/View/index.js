import React, { useEffect, useContext } from "react";
import { Container, Row, Col } from "reactstrap";
import Grid from "./Grid.js";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext.js";
import { ViewSalesQuotationProvider } from "./context/ViewSalesQuotationContext.js";
import { portalModules, permissions } from "../../../config/config.js";

const ViewSalesQuotation = () => {
  const title = "View Sales Quotation";
  const moduleName = portalModules.SALES_QUOTATION;
  const { checkUserPermission, userSessionLog } = useContext(UserPermissionsContext);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <ViewSalesQuotationProvider>
      {/* <Breadcrumbs mainTitle={title} parent="POS" title={title} /> */}
      <Container fluid={true}>
        <Row className="size-column">
          {checkUserPermission(moduleName, permissions.READ) ? (
            <Grid />
          ) : (
            <Col>
              <h4 className="mb-4 pb-2 text-center text-warning">
                You don't have authorization to access this content. Contact Admin!
              </h4>
            </Col>
          )}
        </Row>
      </Container>
    </ViewSalesQuotationProvider>
  );
};

export default ViewSalesQuotation;
