import React, { useState } from "react";
import { Card, Row, Col, FormGroup, FormFeedback, Input } from "reactstrap";
import CustomModal from "../../components/CustomModal";
import { useEffect } from "react";

const CustomerModal = (props) => {
  const defaultValues = { CardName: "", contactNo: "" };
  const [customer, setCustomer] = useState(defaultValues);

  const defaultValidation = { CardName: false, contactNo: false };
  const [invalidData, setInvalidData] = useState(defaultValidation);
  // const [validationMsg, setValidationMsg] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  const closeModal = () => {
    setCustomer(defaultValues);
    setInvalidData(defaultValidation);
    props.closeModal();
  };

  const handleChange = (e) => {
    setCustomer({
      ...customer,
      [e.target.name]: e.target.value,
    });
    setInvalidData({ ...invalidData, [e.target.name]: false });
  };

  const handleSubmit = () => {
    const fields = ["CardName", "contactNo"];
    let invalid = false;
    for (let i = 0; i < fields.length; i++) {
      if (!customer[fields[i]]) {
        setInvalidData({ ...invalidData, [fields[i]]: true });
        invalid = true;
        break;
      }
    }
    if (invalid) {
      return;
    } else {
      // setWarningMsg("");
      setInvalidData(defaultValidation);
      alert(JSON.stringify(customer));
    }
  };

  useEffect(() => {
    if (props.newCustomer && (props.newCustomer.CardName || props.newCustomer.ContactNo)) {
      setCustomer({
        CardName: props.newCustomer.CardName,
        contactNo: props.newCustomer.ContactNo,
      });
    }
  }, [props.newCustomer]);

  return (
    <>
      <CustomModal
        modalSize="lg"
        buttonSize="md"
        isOpen={props.isOpen}
        title={"Create Customer"}
        infoMessage={"Enter Customer details & submit the form."}
        isLoading={isLoading}
        handleSubmit={handleSubmit}
        closeModal={closeModal}
      >
        <Card className="shadow px-3 py-2">
          <Row>
            <Col md="5">
              <small className="text-muted">Name</small>
              <FormGroup className="mt-1">
                <Input
                  bsSize="sm"
                  type="text"
                  className="form-control display-4 text-gray-dark"
                  name="CardName"
                  value={customer.CardName}
                  onChange={handleChange}
                  placeholder="Enter Customer Name"
                  invalid={invalidData.CardName}
                />
                <FormFeedback>Enter a valid Customer Name</FormFeedback>{" "}
                {/** {validationMsg.CardName} */}
              </FormGroup>
            </Col>
            <Col md="4">
              <small className="text-muted">Contact#</small>
              <FormGroup className="mt-1">
                <Input
                  bsSize="sm"
                  type="number"
                  className="form-control display-4 text-gray-dark"
                  name="contactNo"
                  value={customer.contactNo}
                  onChange={handleChange}
                  placeholder="Enter Contact#"
                  invalid={invalidData.contactNo}
                />
                <FormFeedback>Enter a valid Contact#</FormFeedback>
              </FormGroup>
            </Col>
          </Row>
        </Card>
      </CustomModal>
    </>
  );
};

export default CustomerModal;
