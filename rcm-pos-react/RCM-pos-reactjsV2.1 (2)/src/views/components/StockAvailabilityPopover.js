import React, { useState, useEffect, useContext } from "react";
import { Popover, PopoverBody, Table } from "reactstrap";
import { getAvailableStock } from "../../helper/items-helper.js";
import { useQueryClient } from "@tanstack/react-query";
import { UserPermissionsContext } from "../../contexts/UserPermissionsContext.js";

const StockAvailabilityPopover = ({ itemCode, targetId }) => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const queryClient = useQueryClient();

  const [availableQuantityPopOver, setAvailableQuantityPopOver] = useState(false);
  const [stockData, setStockData] = useState({ currentLocation: [], others: [] });
  const [warningMsg, setWarningMsg] = useState("");

  const toggleAvailableQuantityPopOver = () => {
    setAvailableQuantityPopOver(!availableQuantityPopOver);
  };

  const getAvailableQtyForAllItems = async (storeWarehouseList) => {
    try {
      const stockResponse = await getAvailableStock(itemCode);

      if (!stockResponse || !Array.isArray(stockResponse)) {
        setWarningMsg("No stock available");
        return;
      }

      // Cache the stock data for validation use
      queryClient.setQueryData(["stockAvailabilityInfo", itemCode], stockResponse);

      const warehouseCodeList = storeWarehouseList.map((w) => w.warehouseCode);

      const currentLocation = [];
      const others = [];

      stockResponse.forEach((stock) => {
        if (stock.ItemCode !== itemCode) return;

        if (warehouseCodeList.includes(stock.WhsCode)) {
          currentLocation.push(stock);
        } else {
          others.push(stock);
        }
      });

      setStockData({ currentLocation, others });
    } catch (err) {
      setWarningMsg(
        err?.response?.data?.message || "Unable to get Item details! Please try again.",
      );
    }
  };

  useEffect(() => {
    if (userSessionLog?.storeId && itemCode) {
      const cachedWarehouseData = queryClient.getQueryData([
        "storeWarehouseList",
        userSessionLog.storeId,
      ]);

      if (cachedWarehouseData) {
        getAvailableQtyForAllItems(cachedWarehouseData);
      } else {
        setWarningMsg("Warehouse data not available in cache.");
      }
    }
  }, [userSessionLog?.storeId, itemCode]);

  const renderStockRows = (list, startIndex = 0) => {
    return list.map((warehouse, index) => (
      <tr key={warehouse.WhsCode}>
        <td>{startIndex + index + 1}</td>
        <td className="text-primary">{warehouse.WhsCode}</td>
        <td className="text-primary">{parseFloat(warehouse.OnHand)}</td>
      </tr>
    ));
  };

  // const { currentLocation, others } = stockData;
  const sortedCurrentLocation = [...stockData.currentLocation].sort((a, b) =>
    a.WhsCode.localeCompare(b.WhsCode),
  );
  const sortedOthers = [...stockData.others].sort(
    (a, b) =>
      // a.WhsCode.localeCompare(b.WhsCode) // Sort by WH Code
      parseFloat(b.OnHand) - parseFloat(a.OnHand), // Sort by Qty
  );

  return (
    <Popover
      placement="left"
      trigger="hover"
      hideArrow={false}
      isOpen={availableQuantityPopOver}
      target={targetId}
      toggle={toggleAvailableQuantityPopOver}
    >
      <h4 className="ml-3 mt-2">Stock Availability</h4>
      <PopoverBody>
        <div style={{ maxHeight: "420px", width: "250px", overflowY: "auto" }}>
          <Table size="sm" className="ml--1 mt--2 mb-0 mr--1 table-sm">
            <thead style={{ backgroundColor: "#8e7ef324" }}>
              <tr>
                <th>#</th>
                <th>Warehouse</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {sortedCurrentLocation.length > 0 && (
                <>
                  <tr>
                    <td colSpan="3" className="font-weight-bold">
                      Current Location
                    </td>
                  </tr>
                  {/* {renderStockRows(currentLocation)} */}
                  {renderStockRows(sortedCurrentLocation)}
                </>
              )}
              {sortedOthers.length > 0 && (
                <>
                  <tr>
                    <td colSpan="3" className="font-weight-bold pt-2">
                      Others
                    </td>
                  </tr>
                  {/* {renderStockRows(others, currentLocation.length)} */}
                  {renderStockRows(sortedOthers, sortedCurrentLocation.length)}
                </>
              )}
              {sortedCurrentLocation.length === 0 && sortedOthers.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center text-muted">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          {warningMsg && <div className="text-warning text-center mt-2">{warningMsg}</div>}
        </div>
      </PopoverBody>
    </Popover>
  );
};

export default StockAvailabilityPopover;
