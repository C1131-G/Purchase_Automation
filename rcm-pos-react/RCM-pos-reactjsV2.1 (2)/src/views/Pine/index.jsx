import React, { useEffect } from "react";
import { Container, Row } from "reactstrap";
// import { Breadcrumbs } from '../../AbstractElements';
import Grid from "./Grid";
import { LeaseProvider } from "./context/LeaseContext";

const title = "Sales";
const Sales = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <LeaseProvider>
      {/* <Breadcrumbs mainTitle={title} parent='POS' title={title} /> */}
      <Container fluid={true}>
        <Row className="size-column">
          <Grid />
        </Row>
      </Container>
    </LeaseProvider>
  );
};

export default Sales;
