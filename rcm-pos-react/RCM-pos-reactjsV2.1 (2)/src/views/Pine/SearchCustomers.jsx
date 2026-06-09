import React, { useState, useContext } from "react";
import { UserMinus, UserPlus } from "react-feather";
import { Button, Card, CardBody, CardHeader, Form, Input } from "reactstrap";
import HeaderCard from "../../components/Headers/HeaderCardSmall";
import CustomerAutoComplete from "../components/CustomerAutoComplete";
import CustomerModal from "./CustomerModal";
import { LeaseContext } from "./context/LeaseContext";

const SearchCustomers = () => {
  const { setSalesCustomer } = useContext(LeaseContext);
  //TODO: Replace ContactNo with correct mob# prop.
  const defaultCustomerInfo = { CardName: "", ContactNo: "" };
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
          setNewCustomer({ CardName: selectedCustomer.CardName, ContactNo: "" });
        }
        //If a no. is entered then it must be a Contact#
        else {
          setNewCustomer({ CardName: "", ContactNo: selectedCustomer.CardName });
        }
        setOpenModal(true);
      }
      //If the customer already exists display the selected values
      else {
        setSalesCustomer(selectedCustomer);
      }
    } else {
      setSalesCustomer(defaultCustomerInfo);
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
            <Button size="sm" color="primary" onClick={handleAddNew}>
              Add New
              <UserPlus size="18" className="ml-2" />
            </Button>
          }
        />
        <CardBody className="pt-0">
          <div className="flex-nowrap">
            {/* <Input className="form-control-plaintext" type="search" placeholder="Enter Customer Name or Mobile#.." />
          <span className="text-white btn-primary input-group-text">Search</span> */}
            <CustomerAutoComplete size="sm" handleSelection={handleSelection} />
          </div>
        </CardBody>
      </Card>
      <CustomerModal isOpen={openModal} newCustomer={newCustomer} closeModal={closeModal} />
    </>
  );
};

export default SearchCustomers;
