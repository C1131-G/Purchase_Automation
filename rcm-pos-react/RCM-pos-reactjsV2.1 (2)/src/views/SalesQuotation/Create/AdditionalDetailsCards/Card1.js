import React, { useContext, useEffect, useState } from "react";
import { Card, CardBody, Row, Col, CustomInput } from "reactstrap";
import SalesEmployeeDropdown from "../../../components/SalesEmployeeDropdown.js";
import OneTimeCustomerPopover from "../../../components/OneTimeCustomerPopup/index.js";

import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesQuotationContext } from "../context/SalesQuotationContext.js";
import { getCustomerInfo } from "../../../../helper/customer.js";

const AdditionalDetailsCard = ({ setWarningMsg }) => {
  const { userSessionLog, getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);

  const {
    setSalesQuotationCustomer,
    setCustomerAddress,
    isOneTimeCustomer,
    setIsOneTimeCustomer,
    isCODCustomer,
    setIsCODCustomer,
    oneTimeCustomerDetails,
    setOneTimeCustomerDetails,
    salesQuotationHeader,
    setSalesQuotationHeader,
    isEditQuotation,
    setSalesQuotationResponse,
  } = useContext(SalesQuotationContext);

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
          const { CardName, CreditLimit, AvailableBalance } = customerInfo[0];

          // Add Cust. Name, Credit Limit & Available Bal. to OTC
          setOneTimeCustomerDetails({
            ...oneTimeCustomerDetails,
            CardName,
            CreditLimit,
            AvailableBalance,
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
      setSalesQuotationHeader("SalesPersonCode", userSessionLog.userSalesEmployeeCode);
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
              setCustomer={setSalesQuotationCustomer} // to remove selected Customer when OTC checkbox is checked
              setCustomerAddress={setCustomerAddress} // to remove selected Customer's Address when OTC checkbox is checked
              setInvoiceResponse={setSalesQuotationResponse} // to rest current SalesQuotation Response when OTC info are entered
              isEditQuotation={isEditQuotation}
            />
          </Col>
          <Col sm="12">
            <SalesEmployeeDropdown
              label={"Sales Employee"}
              propName={"SalesPersonCode"}
              value={salesQuotationHeader?.SalesPersonCode}
              handleChange={setSalesQuotationHeader}
              userCode={userSessionLog.userName}
              storeLocation={userSessionLog.storeLocation}
              disabled={isEditQuotation}
            />
          </Col>
        </Row>
      </Card>
    </>
  );
};

export default AdditionalDetailsCard;
