import React from "react";
import { Card, CardHeader, Button, Col, Row } from "reactstrap";

import LeaseInfo from "./LeaseInfo";
import LandOwnerInfo from "./LandOwnerInfo";

const Grid = () => {
  return (
    <Col md="12" className="box-col-8 grid-ed-12">
      <Card className="bg-white shadow p-4">
        <CardHeader className="border-0 mb--4 mt--2">
          {" "}
          {/** bg-white */}
          <Row className="align-items-center mt--2">
            <Col sm="4">
              <h3 className="mb-3 ml--4">Fiji Pine Limited</h3>
            </Col>
            <Col className="text-right" xs="8">
              <>
                <Button
                  color="info"
                  className="ml-2"
                  // onClick={this.submitRequest}
                  size="sm"
                >
                  Submit
                </Button>
                &nbsp;
                <Button
                  color="danger"
                  // onClick={this.resetForm}
                  size="sm"
                >
                  Cancel
                </Button>
              </>
            </Col>
          </Row>
        </CardHeader>
        <Row className="row">
          <Col md="12" className="box-col-12">
            <LandOwnerInfo />
          </Col>
          <Col md="12" className="box-col-12">
            <LeaseInfo />
          </Col>
        </Row>
      </Card>
    </Col>
  );
};

export default Grid;
