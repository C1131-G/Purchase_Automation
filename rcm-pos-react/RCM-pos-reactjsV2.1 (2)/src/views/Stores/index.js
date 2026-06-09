import React, { Suspense, useState, useContext, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Row, Col } from "reactstrap";

import Header from "../../components/Headers/Header";
import ToastMessage from "../../components/ToastMessage";
import PageContainer from "../../components/PageContainer";
import StoreListCard from "./StoreListCard";
import StoreDetailsCard from "./StoreDetailsCard";
import StoreWarehouse from "./Warehouse";
import StoreUsers from "./Users";
import StoreCounters from "./Counter";

import {
  portalModules,
  permissions,
  displayModes,
  nonSAPModules,
  statusColors,
} from "../../config/config";
import { getStore, createStore, updateStore, deleteStore } from "../../helper/store";
import { UserPermissionsContext } from "../../contexts/UserPermissionsContext";

const Store = () => {
  const { checkUserPermission } = useContext(UserPermissionsContext);
  const queryClient = useQueryClient();
  const storeQueryKey = "storeList";

  const [displayMode, setDisplayMode] = useState(displayModes.VIEW);
  const [store, setStore] = useState({});
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(undefined); //DONOT change this `default` value, `undefined` is required in the `RecordListCard` comp.
  const [storeList, setStoreList] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [operation, setOperation] = useState("");
  const [invalidData, setInvalidData] = useState({});

  const validateForm = () => {
    let isValid = false,
      duplicateIndex = -1;

    // console.log("selectedStoreIndex: ", selectedStoreIndex, "store.storeName: ", store.storeName);
    // console.log("storeList: ", JSON.stringify(storeList));

    //TODO: This doesnt catch when the newly entered `Store Name` matches the 1st Store (index `0`) name.
    //Need to fix it!
    if (Array.isArray(storeList) && storeList.length > 0) {
      duplicateIndex = storeList.findIndex(
        (ele, index) =>
          ((!isNaN(selectedStoreIndex) && index !== selectedStoreIndex) ||
            isNaN(selectedStoreIndex)) &&
          ele.storeName === store.storeName.trim(),
      );
    }

    if (!store.storeName || !store.storeName.trim()) {
      // console.log("store.storeName: |", store.storeName.trim(), "|");
      setInvalidData({ storeName: "Enter a valid Store Name" });
    } else if (duplicateIndex > -1) {
      setInvalidData({ storeName: "Store Name already exists!" });
    } else {
      setInvalidData({});
      isValid = true;
    }
    return isValid;
  };

  const resetForm = () => {
    setStore({ storeName: "", location: "", description: "" });
    setInvalidData({});
  };

  const handleCancel = () => {
    setDisplayMode(displayModes.VIEW);
    setOperation(displayModes.VIEW);
    setInvalidData({});
  };

  const handleEdit = () => {
    setDisplayMode(displayModes.EDIT);
    setOperation(displayModes.EDIT);
  };

  const handleCreate = () => {
    setDisplayMode(displayModes.EDIT);
    setOperation(displayModes.CREATE);
    resetForm();
  };

  const handleCopy = () => {};

  const handleSave = async () => {
    if (validateForm()) {
      setIsLoading(true);
      setInvalidData({});

      try {
        //Trim the storeName before sending to the api
        // const response = await createStore({ ...store, storeName: store.storeName.trim() });

        //Add the new rec. to the query & set it as `selected`
        if (operation === displayModes.CREATE) {
          const newStore = await createStore(store);
          queryClient.setQueryData([storeQueryKey], (old) => [...old, newStore]);
          setSelectedStoreIndex(storeList.length);
          setSuccessMsg("Store has been created successfully!");
        } else if (operation === displayModes.EDIT) {
          const updatedStore = await updateStore(store, store.storeId);
          if (updatedStore) {
            //Replace the old rec. in the query with the update one without `mutating` it //v6
            queryClient.setQueryData([storeQueryKey], (oldStores) =>
              oldStores.map((oldStore) => (oldStore.storeId === store.storeId ? store : oldStore)),
            );
            setSuccessMsg("Store has been updated successfully!");
          }
          // queryClient.setQueryData([storeQueryKey, updatedStore.storeId], updatedStore); //v1
          // queryClient.setQueryData([storeQueryKey], updatedStore); //v2
          // queryClient.setQueryData(storeQueryKey, updatedStore); //v3

          // queryClient.setQueryData([storeQueryKey], old =>
          //   old.splice(selectedStoreIndex, 0, updatedStore)); v4
          // queryClient.setQueryData([storeQueryKey, { storeId: updatedStore.storeId}], updatedStore); //v5
        }

        setDisplayMode(displayModes.VIEW);
        setOperation("");
      } catch (err) {
        console.log("handleSave: ", JSON.stringify(err));
        setWarningMsg(JSON.stringify(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSetStore = (newStore) => {
    setStore(newStore);
  };

  return (
    <>
      <Header />
      {/* Page content */}
      <PageContainer
        title={"Store Setup"}
        subTitle={"Create, Edit & Update Store info"}
        displayMode={displayMode}
        isLoading={isLoading}
        isRecordsAvailable={true} //Array.isArray(storeList) && storeList.length > 0
        handleCreate={handleCreate} //checkUserPermission(moduleName, permissions.CREATE) ? handleCreate ? undefined
        // handleCopy={handleCopy}
        handleEdit={handleEdit} //checkUserPermission(moduleName, permissions.WRITE) ? handleEdit : undefined
        handleSave={handleSave}
        handleCancel={handleCancel}
      >
        <Row>
          <Col md="3">
            <StoreListCard
              displayMode={displayMode}
              operation={operation}
              store={store}
              selectedStoreIndex={selectedStoreIndex}
              queryKey={storeQueryKey}
              setStore={setStore}
              setSelectedStoreIndex={setSelectedStoreIndex}
              setStoreList={setStoreList}
              setDisplayMode={setDisplayMode}
              setSuccessMsg={setSuccessMsg}
              setWarningMsg={setWarningMsg}
              setIsLoading={setIsLoading}
            />
          </Col>
          <Col md="9">
            <Row>
              <Col xs="12">
                <StoreDetailsCard
                  displayMode={displayMode}
                  store={store}
                  selectedStoreIndex={selectedStoreIndex}
                  storeList={storeList}
                  invalidData={invalidData}
                  setStore={handleSetStore}
                />
              </Col>
              {/** Hide Child recs. card during CREATE op. or when No Store is added yet. */}
              {operation !== displayModes.CREATE &&
                storeList &&
                Array.isArray(storeList) &&
                storeList.length > 0 && (
                  <>
                    <Col xs="12" className="mb-3">
                      <StoreWarehouse
                        parentId={store.storeId}
                        displayMode={displayMode}
                        setSuccessMsg={setSuccessMsg}
                        setWarningMsg={setWarningMsg}
                        locationCode={store.locationCode}
                      />
                    </Col>
                    <Col xs="12" className="mb-3">
                      <StoreUsers
                        parentId={store.storeId}
                        displayMode={displayMode}
                        setSuccessMsg={setSuccessMsg}
                        setWarningMsg={setWarningMsg}
                      />
                    </Col>
                    <Col xs="12" className="mb-3">
                      <StoreCounters
                        parentId={store.storeId}
                        displayMode={displayMode}
                        setSuccessMsg={setSuccessMsg}
                        setWarningMsg={setWarningMsg}
                      />
                    </Col>
                  </>
                )}
            </Row>
          </Col>
        </Row>
      </PageContainer>

      {successMsg ? (
        <ToastMessage type={statusColors.SUCCESS} message={successMsg} />
      ) : warningMsg ? (
        <ToastMessage type={statusColors.WARNING} message={warningMsg} />
      ) : null}
    </>
  );
};

export default Store;
