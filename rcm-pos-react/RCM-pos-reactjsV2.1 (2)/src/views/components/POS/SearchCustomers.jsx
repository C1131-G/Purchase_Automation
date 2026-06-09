import React, { useState, useContext } from "react";
import { UserMinus, UserPlus } from "react-feather";
import { Button, Card, CardBody, CardHeader, Form, Input } from "reactstrap";
import HeaderCard from "../../../components/Headers/HeaderCardSmall.js";
import CustomerAutoComplete from "../AutoComplete/CustomerAutoComplete";
import CreateCustomerModal from "./CreateCustomerModal.js";

const SearchCustomers = ({
  setCustomer,
  setOneTimeCustomer,
  setIsOneTimeCustomer,
  isDisabled,
  setInvoiceResponse = undefined,
}) => {
  const defaultCustomerInfo = { CardName: "", Cellular: "" };
  const [newCustomer, setNewCustomer] = useState(defaultCustomerInfo);
  const [openModal, setOpenModal] = useState(false);

  const closeModal = () => {
    setOpenModal(false);
  };

  const handleAddNew = () => {
    setOpenModal(true);
  };

  const handleSelection = (selectedCustomer) => {
    console.log("Selected Customer: ", JSON.stringify(selectedCustomer));
    if (selectedCustomer) {
      //TypeAhead sets `customOption` as true when user clicks on a new value that's not in backend
      if (selectedCustomer.customOption) {
        //If the `searchKey` entered by the user is a text then it must be a Customer Name
        if (isNaN(parseInt(selectedCustomer.CardName))) {
          setNewCustomer({ CardName: selectedCustomer.CardName, Cellular: "" });
        }
        //If a no. is entered then it must be a Contact#
        else {
          setNewCustomer({ CardName: "", Cellular: selectedCustomer.CardName });
        }
        setOpenModal(true);
      }
      //If the customer already exists in SAP display the selected values
      else {
        setCustomer(selectedCustomer);
        setInvoiceResponse("");
      }

      // Reset OTC details when a cust. is selected
      setOneTimeCustomer("");
      setIsOneTimeCustomer(false);
    } else {
      setCustomer(defaultCustomerInfo);
      setNewCustomer(defaultCustomerInfo);
    }
  };

  return (
    <>
      <Card className="shadow">
        <HeaderCard
          title={"Customer"}
          className="border-0"
          rightContent={
            <Button size="sm" color="primary" onClick={handleAddNew} disabled={isDisabled}>
              Add New
              <UserPlus size="18" className="ml-2" />
            </Button>
          }
        />
        <CardBody className="pt-0">
          <div className="flex-nowrap">
            {/* <Input className="form-control-plaintext" type="search" placeholder="Enter Customer Name or Mobile#.." />
          <span className="text-white btn-primary input-group-text">Search</span> */}
            <CustomerAutoComplete
              size="sm"
              handleSelection={handleSelection}
              disabled={isDisabled}
            />
          </div>
        </CardBody>
      </Card>
      <CreateCustomerModal
        isOpen={openModal}
        newCustomer={newCustomer}
        closeModal={closeModal}
        setCustomerInfo={setCustomer}
      />
    </>
  );
};

export default SearchCustomers;
