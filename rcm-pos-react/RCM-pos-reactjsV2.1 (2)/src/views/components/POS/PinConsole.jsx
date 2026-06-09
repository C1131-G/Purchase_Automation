import React, { useState } from "react";
import { Button, Container, Row, Col, Input } from "reactstrap";
import { ArrowLeft } from "react-feather";

const PinConsole = (props) => {
  const [pin, setPin] = useState("");

  // const handlePinEntry = (digit) => {
  //   setPin((prevPin) => prevPin + digit);
  // };

  // const handleClearPin = () => {
  //   setPin((prevPin) => prevPin.slice(0, -1));
  // };

  // const handlePinSubmit = () => {
  //   console.log("PIN submitted:", pin);
  // };

  return (
    <Container>
      <Row>
        <Col>
          {/* <h4>Enter PIN</h4> */}
          <div className="pin-console ml--3">
            <Row className="mb-3">
              {[1, 2, 3].map((digit) => (
                <Col key={digit} className="text-center" sm={props.keySize}>
                  <Button
                    color="light"
                    onClick={() => props.handlePinEntry(digit)}
                    className="px-4 py-3 font-weight-700"
                    size="lg"
                  >
                    {digit}
                  </Button>
                </Col>
              ))}
            </Row>
            <Row className="mb-3">
              {[4, 5, 6].map((digit) => (
                <Col key={digit} className="text-center" sm={props.keySize}>
                  <Button
                    color="light"
                    onClick={() => props.handlePinEntry(digit)}
                    className="px-4 py-3 font-weight-700"
                    size="lg"
                  >
                    {digit}
                  </Button>
                </Col>
              ))}
            </Row>
            <Row className="mb-3">
              {[7, 8, 9].map((digit) => (
                <Col key={digit} className="text-center" sm={props.keySize}>
                  <Button
                    color="light"
                    onClick={() => props.handlePinEntry(digit)}
                    className="px-4 py-3 font-weight-700"
                    size="lg"
                  >
                    {digit}
                  </Button>
                </Col>
              ))}
            </Row>
            <Row>
              {/* <Col className="text-center">
                <Button
                  color="light"
                  onClick={() => props.handlePinEntry(".")}
                  className="px-4 py-3"
                  size="lg"
                >
                  .
                </Button>
              </Col> */}
              <Col className="text-center" sm={props.keySize}>
                <Button
                  color="light"
                  onClick={() => props.handlePinEntry(0)}
                  className="px-4 py-3 font-weight-700"
                  size="lg"
                >
                  0
                </Button>
              </Col>
              <Col className="text-center" sm={props.keySize}>
                <Button
                  color="light"
                  onClick={() => props.handlePinEntry(".")}
                  className="px-4 py-3 font-weight-700"
                  size="lg"
                >
                  .
                </Button>
              </Col>
              <Col className="text-center" sm={props.keySize}>
                <Button
                  color="danger"
                  onClick={props.handleClearPin}
                  className="px-4 py-3 font-weight-700"
                  size="lg"
                >
                  <ArrowLeft size={20} />
                </Button>
              </Col>
            </Row>
            {/* <Row>
              <Col className="text-center">
                <Button
                  color="success"
                  onClick={handlePinSubmit}
                  className="btn-square"
                  size="lg"
                >
                  OK
                </Button>
              </Col>
            </Row> */}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default PinConsole;
