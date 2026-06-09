import React, { useContext } from "react";
import { LeaseContext } from "./context/LeaseContext";

const CustomerCard = () => {
  const { customer } = useContext(LeaseContext);
  return (
    <>
      {Object.keys(customer).length > 1 ? (
        <div className="user-list mt-1 ml-2">
          {/* <div className="user-icon primary">
            <div className="user-box">
              <UserPlus className="text-primary" />
            </div>
          </div> */}
          <div className="text-sm">
            <span className="mb-1 text-primary font-weight-700">{customer.CardName}</span>
            <span className="d-flex align-items-center">
              {/* <span className="d-flex justify-contents-inbetween"> */}
              {/* <i className="icon-arrow-up icon-rotate me-1"> </i> */}
              Contact#: &emsp; <span className="font-weight-700">{customer.CardCode}</span>
            </span>
            {/* <span>New Customer: {JSON.stringify(newCustomer)}</span> */}
            {/* <span className="font-weight-600">Address Line #1,</span><br />
            <span className="font-weight-600">Viti Levu, Suva</span> */}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CustomerCard;
