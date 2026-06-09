import React, { useState } from "react";
import {
  Row,
  Col,
  Card,
  CardBody,
  Label,
  InputGroupText,
  InputGroup,
  NavItem,
  NavLink,
  Input,
  Button,
} from "reactstrap";
import HeaderCard from "../../../components/Headers/HeaderCardSmall";

import PinConsole from "../../components/POS/PinConsole";

const CashDrawerActions = () => {
  return (
    <Card className="shadow">
      <HeaderCard title={"Cash Drawer Actions"} />
      <CardBody>
        <Row>
          <Col md="4">
            <Row>
              <Col md="12" className="mb-3">
                <Label className="f-w-500">Expected Amount In Drawer</Label>
                {/* <Input className="form-control" type="text" /> */}
                <InputGroup>
                  <InputGroupText>{"$"}</InputGroupText>
                  <Input className="form-control" type="text" />
                </InputGroup>
              </Col>
              <Col md="12" className="mb-3">
                <Label className="f-w-500">Type</Label>
                <Input type="select" name="select" className="form-control form-control-sm digits">
                  <option>{"Cash In"}</option>
                  <option>{"Cash Out"}</option>
                  <option>{"Pay In"}</option>
                  <option>{"Pay Out"}</option>
                </Input>
              </Col>
              <Col md="12" className="mb-3">
                <Label className="f-w-500">Amount</Label>
                <InputGroup>
                  <InputGroupText>{"$"}</InputGroupText>
                  <Input className="form-control" type="text" />
                </InputGroup>
              </Col>
              <Col md="12" className="mb-3">
                <Label className="f-w-500">Reason/Comments</Label>
                <Input className="form-control" type="textarea" row={4} />
              </Col>
            </Row>
            <Row className="text-center mt-3">
              <Col>
                <Button
                  color="danger"
                  // onClick={() => handleCancel()}
                  className="btn-square"
                  size="lg"
                >
                  Cancel
                </Button>
              </Col>
              <Col className="mr-2">
                <Button
                  color="success"
                  // onClick={() => handleSubmit()}
                  className="btn-square"
                  size="lg"
                >
                  Submit
                </Button>
              </Col>
            </Row>
          </Col>
          <Col md="3">
            <PinConsole />
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default CashDrawerActions;
