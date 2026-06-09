import React, { useContext } from "react";

const OneTimeCustomerInfo = ({ isCODCustomer, oneTimeCustomerDetails }) => {
  return (
    <>
      <div className="list-col-2 mt-1 ml-0 d-flex">
        {/* <div className="user-icon primary">
          <div className="user-box">
            <UserPlus className="text-primary" />
          </div>
        </div> */}
        <div className="text-sm">
          Customer Name: &emsp;
          <span className="mb-0 pt-3 text-primary font-weight-700">
            {
              oneTimeCustomerDetails.U_CODCntName
                ? // Display the OTC Customer Name entered by the user
                  oneTimeCustomerDetails.U_CODCntName
                : // or Display the default Cust. Name based on the Location
                  oneTimeCustomerDetails.CardName //getLocationBasedDefaultCardCode(isCODCustomer)
            }
          </span>{" "}
          &emsp;|&emsp;
          <span className="justify-context-left">
            {/* <span className="d-flex justify-contents-inbetween"> */}
            {/* <i className="icon-arrow-up icon-rotate me-1"> </i> */}
            Contact#: &emsp;{" "}
            <span className="font-weight-700">
              {oneTimeCustomerDetails.U_CODTlePhone ? oneTimeCustomerDetails.U_CODTlePhone : "NA"}
            </span>
          </span>{" "}
          &emsp;|&emsp;
          <span className="justify-context-between">
            {/* <span className="d-flex justify-contents-inbetween"> */}
            {/* <i className="icon-arrow-up icon-rotate me-1"> </i> */}
            Email: &emsp;{" "}
            <span className="font-weight-700">
              {oneTimeCustomerDetails.U_CODEmail ? oneTimeCustomerDetails.U_CODEmail : "NA"}
            </span>
          </span>
          {isCODCustomer && (
            <>
              <br />
              <span>
                Address: &emsp;{" "}
                <span className="font-weight-700">
                  {oneTimeCustomerDetails.U_CODAddress ? oneTimeCustomerDetails.U_CODAddress : "NA"}
                </span>
              </span>
            </>
          )}
          {/* <span>New Customer: {JSON.stringify(newCustomer)}</span> */}
          {/* <span className="font-weight-600">Address Line #1,</span><br />
          <span className="font-weight-600">Viti Levu, Suva</span> */}
        </div>
      </div>
    </>
  );
};

export default OneTimeCustomerInfo;
