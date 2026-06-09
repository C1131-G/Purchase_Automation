import React, { useState } from "react";
import {
  Row,
  Col,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  FormGroup,
  Input,
} from "reactstrap";
import HeaderCard from "../../components/Headers/HeaderCardSmall";
import CustomerCard from "./CustomerCard";
import useShowClass from "../../hooks/useShowClass";

const LandOwnerInfo = () => {
  const [isActive, setIsActive] = useState("0");
  const [show, setShow] = useShowClass("show");
  const RecentOrdersNav = ["1", "2", "3", "4", "5"];

  const handleChange = (e) => {};

  const handleSubmit = () => {};

  const handleCancel = () => {};

  return (
    <>
      <h6 className="heading-small text-muted mb-3">Land Owner Details</h6>
      {/** <div className="pl-lg-3 pr-lg-3 mt--1 mb-2"> */}
      <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
        {" "}
        {/** text-center */}
        <Row className="mt--2">
          <Col sm="6" md="4">
            <small className="text-muted">First Name</small>
            <FormGroup className="mt-1 mb-3">
              <Input
                bsSize="sm"
                // readOnly={this.state.displayMode === displayModes.VIEW}
                type="input"
                value={""}
                className="form-control display-4 text-gray-dark"
                id="firstName"
                name="firstName"
                placeholder="Enter First Name"
                onChange={(e) => handleChange(e)}
              />
            </FormGroup>
          </Col>
          <Col sm="6" md="4">
            <small className="text-muted">Last Name</small>
            <FormGroup className="mt-1">
              <Input
                bsSize="sm"
                // readOnly={this.state.displayMode === displayModes.VIEW}
                value={""}
                className={"form-control display-4 text-gray-dark "}
                id="lastName"
                name="lastName"
                placeholder="Enter Last Name"
                type="number"
                onChange={(e) => this.handleChange(e)}
              />
            </FormGroup>
          </Col>
          <Col sm="6" md="4">
            <small className="text-muted">Contact No.</small>
            <FormGroup className="mt-1">
              <Input
                bsSize="sm"
                // readOnly={this.state.displayMode === displayModes.VIEW}
                value={""}
                className={"form-control display-4 text-gray-dark "}
                id="contactNo"
                name="contactNo"
                placeholder="Enter Contact#"
                type="number"
                onChange={(e) => handleChange(e)}
              />
            </FormGroup>
          </Col>
          <Col sm="6" md="4">
            <small className="text-muted">Address</small>
            <FormGroup className="mt-1">
              <Input
                bsSize="sm"
                // readOnly={this.state.displayMode === displayModes.VIEW}
                value={""}
                className={"form-control display-4 text-gray-dark "}
                id="address"
                name="address"
                placeholder="Enter Land Owner Address"
                type="textarea"
                rows={4}
                onChange={(e) => handleChange(e)}
              />
            </FormGroup>
          </Col>
          {/* <Col sm="6" md="3">
            <small className="text-muted">Under 80G</small>
            <FormGroup className="mt-1 mb-3">
              <Input
                bsSize="sm"
                readOnly={this.state.displayMode === displayModes.VIEW}
                type="select"
                value={this.state.under80G}
                className="form-control display-4 text-gray-dark"
                id="under80G"
                name="under80G"
                placeholder=""
                onChange={(e) => this.handleChange(e)}
              >
                <option value="">-- Select an option --</option>
                <option key={1} value={"Yes"}>Yes</option>
                <option key={2} value={"No"}>No</option>
              </Input>
            </FormGroup>
          </Col> */}
        </Row>
      </Card>
    </>
  );
};

export default LandOwnerInfo;
