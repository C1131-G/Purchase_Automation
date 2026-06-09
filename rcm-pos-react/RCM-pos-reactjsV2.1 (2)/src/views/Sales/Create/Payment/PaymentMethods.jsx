import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Card, CardBody, TabContent, TabPane, Nav, NavItem, NavLink } from "reactstrap";
import HeaderCard from "../../../../components/Headers/HeaderCardSmall";
import CashPayment from "./CashPayment.js";
import CardPayment from "./CardPayment/index.js";
import CreditPayment from "./CreditPayment.js";
import CheckPayment from "./CheckPayment/index.js";
import {
  currencySymbols,
  systemCurrency,
  PRECISION,
  PAYMENT_METHODS,
} from "../../../../config/config.js";
import { round } from "../../../../config/util";

import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./../context/SalesContext.js";
import { roundPrice } from "views/common-utils/calculations.util";

const PaymentSummaryInfo = () => {
  //TODO: Need to get these info from Context
  // const { paymentSummary } = useContext(SalesContext);
  const { getTotalInvoiceAmount, getPaidAmount } = useContext(SalesContext);

  return (
    <Row className="text-md font-weight-600 mb--2">
      <Col xs="auto" className="text-info text-right">
        Invoice Amt.: {`${currencySymbols[systemCurrency]}`}{" "}
        <b className="display-4">{`${roundPrice(getTotalInvoiceAmount())}`}</b>
      </Col>
      <Col xs="auto" className="text-success">
        Paid: {`${currencySymbols[systemCurrency]}`}{" "}
        <b className="display-4">{`${getPaidAmount() ? round(getPaidAmount(), 2) : 0}`}</b>
      </Col>
      <Col xs="auto" className="text-warning mr-2">
        Bal.: {`${currencySymbols[systemCurrency]}`}{" "}
        <b className="display-4">{`${roundPrice(getTotalInvoiceAmount() - getPaidAmount(), 2)}`}</b>
      </Col>
    </Row>
  );
};

const PaymentMethods = ({ setWarningMsg, isPaymentAllowed }) => {
  const { getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);
  const { isOneTimeCustomer, isCODCustomer, oneTimeCustomerDetails, customer } =
    useContext(SalesContext);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [activeTab, setActiveTab] = useState(1);
  //const [selectedEftpos, setSelectedEftpos] = useState("VISA"); //rvin

  useEffect(() => {
    if (isCODCustomer) {
      setSelectedCustomer(oneTimeCustomerDetails);
    }
  }, [isCODCustomer]);

  useEffect(() => {
    if (customer) {
      setSelectedCustomer(customer);
    }
    console.log("isPaymentAllowed", isPaymentAllowed);
  }, [customer]);

  const paymentTypes = [
    PAYMENT_METHODS.Cash,
    PAYMENT_METHODS.Card,
    PAYMENT_METHODS.Credit,
    PAYMENT_METHODS.Check,
  ];
  return (
    <Card className="shadow">
      <HeaderCard
        title={"Payment"}
        className="border-0 mb--4"
        rightContent={<PaymentSummaryInfo />}
      />
      <CardBody className="mt--2">
        <div className="nav-wrapper">
          <Nav className="pull-right nav-primary" pills>
            {paymentTypes.map((type, key) => {
              // Hide Credit tab for `OTC`
              if (
                (!isOneTimeCustomer || isCODCustomer || (isOneTimeCustomer && type != "Credit")) &&
                (isPaymentAllowed || (!isPaymentAllowed && type === "Credit"))
              ) {
                return (
                  <NavItem>
                    <NavLink
                      className={activeTab === key + 1 ? "active" : "" + " cursor-pointer"}
                      onClick={() => setActiveTab(key + 1)}
                    >
                      {/* {item.homeIcon ? item.homeIcon : ""}  */}
                      {type == "Cheque" ? "Cheque/Voucher Payment" : type}
                    </NavLink>
                  </NavItem>
                );
              }
            })}
          </Nav>
          <TabContent activeTab={activeTab} className="mt-4">
            {isPaymentAllowed ? (
              <>
                <TabPane tabId={1}>
                  <CashPayment type={PAYMENT_METHODS.Cash} />
                </TabPane>

                <TabPane tabId={2}>
                  <CardPayment type={PAYMENT_METHODS.Card} setWarningMsg={setWarningMsg} />
                </TabPane>

                {/* Enable `Credit` payment for non-OTCs & COD Customer */}
                {(!isOneTimeCustomer || isCODCustomer) && (
                  <TabPane tabId={3}>
                    <CreditPayment
                      type={PAYMENT_METHODS.Credit}
                      customer={selectedCustomer}
                      setWarningMsg={setWarningMsg}
                    />
                  </TabPane>
                )}
                <TabPane tabId={4}>
                  {/* <p className="mb-0">
                Post-Dated Cheque (PDC) is required during a Credit based purchase.
              </p> */}
                  <CheckPayment type={PAYMENT_METHODS.Check} setWarningMsg={setWarningMsg} />
                </TabPane>
              </>
            ) : (
              <>
                {(!isOneTimeCustomer || isCODCustomer) && (
                  <TabPane tabId={1}>
                    <CreditPayment
                      type={PAYMENT_METHODS.Credit}
                      customer={selectedCustomer}
                      setWarningMsg={setWarningMsg}
                    />
                  </TabPane>
                )}
              </>
            )}
          </TabContent>
        </div>
      </CardBody>
    </Card>
  );
};

export default PaymentMethods;
