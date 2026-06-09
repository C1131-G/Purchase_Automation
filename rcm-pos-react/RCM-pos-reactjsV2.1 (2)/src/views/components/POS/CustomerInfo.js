import React, { useContext, useState, useEffect } from "react";
import CustomerAddressAutoComplete from "../../components/AutoComplete/CustomerAddressAutoComplete";
import { Input } from "reactstrap"; // or use your own Input component
import CustomerManualAddressInput from "./CustomerManualAddressInput";
import { getCustomerAddress } from "../../../helper/customer";

const CustomerInfo = ({
  customer,
  customerAddress,
  setCustomerAddress,
  setWarningMsg,
  isEditQuotation,
}) => {
  const [addressInput, setAddressInput] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);
  /**
   * Sets the selected Address to the context
   * @param {Object} selectedRecord
   */
  const handleAddressSelection = (selectedRecord) => {
    console.log("handleAddressSelection: ", JSON.stringify(selectedRecord));
    if (selectedRecord && selectedRecord.Address) {
      setCustomerAddress(selectedRecord);
      setUseManualInput(false);
    } else {
      //setCustomerAddress("");
    }
  };

  const handleManualAddressChange = (addressObj) => {
    setCustomerAddress(addressObj);
    setAddressInput(addressObj.Address);
    setUseManualInput(true);
  };

  // Sync local input if parent changes customerAddress (e.g., on load)
  useEffect(() => {
    console.log("customerAddress?.Address2", customerAddress?.Address2);
    if (customerAddress?.Address2) {
      setAddressInput(customerAddress.Address2);
      setUseManualInput(true);
    } else if (customerAddress && customerAddress.Address) {
      console.log("customerAddress?.Address1", customerAddress);
      setCustomerAddress(customerAddress);
      setUseManualInput(false);
    }
  }, [customerAddress]);

  useEffect(() => {
    const getCustomerAddressInfo = async (cardCode) => {
      const custAddress = await getCustomerAddress(cardCode);
      console.log("customerAddress?.Address1", JSON.stringify(custAddress));
      setCustomerAddress({
        ...custAddress,
        Address: custAddress[0].Address || "", // Ensure Address is a string
        Block: custAddress[0].Block || "",
        Block: custAddress[0].Block || "",
        City: custAddress[0].City || "",
        Building: custAddress[0].Building || "",
        Street: custAddress[0].Street || "",
        LicTradNum: custAddress[0].LicTradNum || "",
        //label: custAddress.Address || ''    // Optional: to help typeahead if using 'label'
      });
      setUseManualInput(false);
    };
    console.log("customer Address", JSON.stringify(customerAddress));
    if (isEditQuotation) {
      getCustomerAddressInfo(customer.CardCode);
    }
  }, []);

  return (
    <>
      {Object.keys(customer).length > 1 ? (
        <div className="list-col-2 mt-1 ml-0 d-flex">
          {/* <div className="user-icon primary">
            <div className="user-box">
              <UserPlus className="text-primary" />
            </div>
          </div> */}
          <div className="text-sm">
            Customer Name: &emsp;
            <span className="mb-0 pt-3 text-primary font-weight-700">{customer.CardName}</span>
            {/* &emsp;&emsp; */}
            &emsp;|&emsp;
            <span className="mb-2">
              {/* <span className="d-flex justify-contents-inbetween"> */}
              {/* <i className="icon-arrow-up icon-rotate me-1"> </i> */}
              Contact#: &emsp; <span className="font-weight-700">{customer.Cellular}</span>
            </span>
            {/* <span>New Customer: {JSON.stringify(newCustomer)}</span> */}
            {/* <span className="font-weight-600">Address Line #1,</span><br />
            <span className="font-weight-600">Viti Levu, Suva</span> */}
            {
              customer.CardCode && (
                // <span className="pt-2 d-flex">
                // <span className="justify-context-between">
                <>
                  {/* Address: &emsp; <span className="font-weight-700"> */}
                  {/* <small className="text-left">Address</small> */}
                  {!useManualInput ? (
                    <CustomerAddressAutoComplete
                      size="sm"
                      customerCardCode={customer.CardCode}
                      value={customerAddress?.Address ? customerAddress : null}
                      handleSelection={handleAddressSelection}
                      disabled={false}
                      setWarningMsg={setWarningMsg}
                    />
                  ) : null}
                  {/* Editable Address Input Field */}
                  {/* <Input
                  size="sm"
                  type="text"
                  placeholder="Enter or edit address"
                  value={addressInput}
                  onChange={handleInputChange}
                  className="mt-1"
                /> */}
                  <CustomerManualAddressInput
                    value={addressInput}
                    onChange={handleManualAddressChange}
                    disabled={false}
                  />
                  {/* </span> */}
                </>
              )
              // </span>
            }
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CustomerInfo;
