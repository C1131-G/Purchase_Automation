import React, { useContext, useEffect, useState } from "react";
import { Card, CardBody, Row, Col, CustomInput } from "reactstrap";
import SalesEmployeeDropdown from "../../../components/SalesEmployeeDropdown.js";
import OneTimeCustomerPopover from "../../../components/OneTimeCustomerPopup/index.js";

import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./../context/SalesContext.js";
import { getCustomerInfo } from "../../../../helper/customer.js";

const AdditionalDetailsCard = ({ setWarningMsg }) => {
  const { userSessionLog, getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);

  const {
    setSalesCustomer,
    setCustomerAddress,
    isOneTimeCustomer,
    setIsOneTimeCustomer,
    isCODCustomer,
    setIsCODCustomer,
    oneTimeCustomerDetails,
    setOneTimeCustomerDetails,
    salesHeader,
    setSalesHeader,
    setBulkOneTimeCustomerDetails,
    setInvoiceResponse,
  } = useContext(SalesContext);

  // To use local state vars. instead of `context`
  // const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(true);
  // const [oneTimeCustomerDetails, setOneTimeCustomerDetails] = useState({});

  /**
   * Get OTC & COD Customer Customer Name & Credit Limit details
   */
  useEffect(() => {
    const getCustomer = async (cardCode) => {
      try {
        const customerInfo = await getCustomerInfo(cardCode);
        if (customerInfo) {
          const { CardName, CreditLimit, AvailableBalance, LicTradNum, Cellular } = customerInfo[0];

          // Add Cust. Name, Credit Limit & Available Bal. to OTC
          setBulkOneTimeCustomerDetails({
            CardName,
            CreditLimit,
            AvailableBalance,
            LicTradNum,
            Cellular,
          });
        }
      } catch (err) {
        setWarningMsg(err);
      }
    };

    if (isOneTimeCustomer) {
      const cardCode = getLocationBasedDefaultCardCode(isCODCustomer);
      if (cardCode) {
        getCustomer(cardCode);
      }
    }
  }, [isOneTimeCustomer, isCODCustomer]);

  /**
   * Set default Sales Employee for the current user
   **/
  useEffect(() => {
    if (userSessionLog.userSalesEmployeeCode) {
      setSalesHeader("SalesPersonCode", userSessionLog.userSalesEmployeeCode);
    }
  }, [userSessionLog.userSalesEmployeeCode]);

  return (
    <>
      <Card className="px-md-2 px-lg-3 pt-sm-3 pb-2 mt-0 mb-3 shadow">
        <Row>
          <Col sm="12">
            <OneTimeCustomerPopover
              checkboxLabel="One-Time / COD Customer"
              enableCODCustomer={true}
              popoverPlacement={"bottom"}
              isOneTimeCustomer={isOneTimeCustomer}
              setIsOneTimeCustomer={setIsOneTimeCustomer}
              isCODCustomer={isCODCustomer}
              setIsCODCustomer={setIsCODCustomer}
              oneTimeCustomerDetails={oneTimeCustomerDetails}
              setOneTimeCustomerDetails={setOneTimeCustomerDetails}
              setCustomer={setSalesCustomer} // to remove selected Customer when OTC checkbox is checked
              setCustomerAddress={setCustomerAddress} // to remove selected Customer's Address when OTC checkbox is checked
              setInvoiceResponse={setInvoiceResponse} // to rest current Invoice Response when OTC info are entered
            />
          </Col>
          <Col sm="12">
            <SalesEmployeeDropdown
              label={"Sales Employee"}
              propName={"SalesPersonCode"}
              value={salesHeader?.SalesPersonCode}
              handleChange={setSalesHeader}
              userCode={userSessionLog.userName}
              storeLocation={userSessionLog.storeLocation}
            />
          </Col>
        </Row>
      </Card>
    </>
  );
};

export default AdditionalDetailsCard;
