import React, { useEffect, useContext } from "react";
import { Container, Row, Col } from "reactstrap";
import Grid from "./Grid.jsx";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext.js";
import { ReturnsProvider } from "./context/ReturnsContext.js";
import { portalModules, permissions } from "../../../config/config.js";

const Returns = () => {
  const title = "Returns";
  const moduleName = portalModules.INVOICE;
  const { checkUserPermission, userSessionLog } = useContext(UserPermissionsContext);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <ReturnsProvider>
      {/* <Breadcrumbs mainTitle={title} parent="POS" title={title} /> */}
      <Container fluid={true}>
        <Row className="size-column">
          {checkUserPermission(moduleName, permissions.CREATE) ? (
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
    </ReturnsProvider>
  );
};

export default Returns;
