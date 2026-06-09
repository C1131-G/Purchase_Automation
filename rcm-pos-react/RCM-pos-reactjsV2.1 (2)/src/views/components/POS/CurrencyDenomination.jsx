import React, { useContext, useState } from "react";
import { Button, Container, Row, Col, Input } from "reactstrap";

const CurrencyDenomination = ({ paidAmount, setPaidAmount }) => {
  const [pin, setPin] = useState("");

  const handleCashEntry = (newAmount) => {
    setPaidAmount(paidAmount + newAmount);
  };

  return (
    <Container>
      <Row>
        <Col>
          {/* <h4>Enter PIN</h4> */}
          <div className="pin-console">
            <Row className="mb-3">
              {[100, 50].map((digit) => (
                <Col key={digit} className="text-center mb-3">
                  <Button
                    color="info"
                    outline
                    onClick={() => handleCashEntry(digit)}
                    className="px-5 py-3 font-weight-700"
                    size="lg"
                  >
                    $ {digit}
                  </Button>
                </Col>
              ))}
            </Row>
            <Row className="mb-4">
              {[20, 10, 5].map((digit) => (
                <Col key={digit} className="text-center">
                  <Button
                    color="info"
                    outline
                    onClick={() => handleCashEntry(digit)}
                    className="px-4 py-2 font-weight-700"
                    size="lg"
                  >
                    $ {digit}
                  </Button>
                </Col>
              ))}
            </Row>
            <Row className="mb-2">
              {[1, 2].map((digit) => (
                <Col key={digit} className="text-center">
                  <Button
                    color="warning"
                    outline
                    onClick={() => handleCashEntry(digit)}
                    className="dollar-button-sm"
                    // size="lg"
                  >
                    {digit}
                  </Button>
                </Col>
              ))}
            </Row>
            {/* <Row>
              <Col className='widget-1'>
                <div className='widget-content'>
                  <div className={`widget-round warning`}>
                    <div className='bg-round'>
                      $1
                    </div>
                  </div>
                </div>
              </Col>
            </Row> */}
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

export default CurrencyDenomination;
