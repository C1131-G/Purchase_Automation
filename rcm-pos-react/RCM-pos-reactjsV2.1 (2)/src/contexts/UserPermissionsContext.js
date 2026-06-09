import React, { createContext, useEffect, useState } from "react";
import { getSessionInfo } from "../helper/session-helper";

export const UserPermissionsContext = createContext();

export const UserPermissionsProvider = ({ children }) => {
  const [userPermissions, setPermissions] = useState([]);
  const [userName, setUserName] = useState("");
  const [displayUserName, setDisplayUserName] = useState("");
  const [userTIN, setUserTIN] = useState("");
  const [userId, setUserId] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [userSessionLog, setUserSessionLog] = useState({});
  const [storeWHCode, setStoreWHCode] = useState("");

  // Get User Info from the server session
  const getUserInfo = async () => {
    try {
      const session = await getSessionInfo();
      if (session && session.permissions && session.userName && session.userId) {
        const {
          permissions,
          userName,
          userId,
          userSessionLog,
          storeWHCode,
          userTIN,
          displayUserName,
        } = session;
        setPermissions(permissions);
        setUserName(userName);
        setUserId(userId);
        setUserSessionLog(userSessionLog);
        setStoreWHCode(storeWHCode);
        setUserTIN(userTIN);
        setDisplayUserName(displayUserName);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to get user permissions", error);
      return false;
    }
  };

  // Refresh user permissions
  const refreshUserInfo = async () => {
    //Fetch the permissions only when the data in the 'context' is removed.
    //This happens when the page refreshes
    if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
      return await getUserInfo();
    }
    return true;
  };

  const setUserPermissions = (userPermissions) => {
    setPermissions(userPermissions);
  };

  const setErrorStatusCode = (statusCode) => {
    setStatusCode(statusCode);
  };

  /**
   * Checks if the logged in user has the permission to View/Edit/Create/Delete a given module
   * @param {String} moduleName   Module which user tries to View/Edit/Create/Delete
   * @param {String} action       View/Edit/Create/Delete operation that user wants to perform on the given module
   */
  const checkUserPermission = (moduleName, action) => {
    let hasPermission = false;
    if (Array.isArray(userPermissions) && userPermissions.length > 0) {
      for (let i = 0; i < userPermissions.length; i++) {
        if (
          ((Array.isArray(moduleName) && moduleName.includes(userPermissions[i].U_ModuleName)) ||
            userPermissions[i].U_ModuleName === moduleName) &&
          userPermissions[i][action] === "Y"
        ) {
          hasPermission = true;
          break;
        }
      }
    }
    return hasPermission;
  };

  // Get permissions when the component mounts
  // useEffect(() => {
  //   console.log("UserPermContext - compDidMount");
  //   const permissions = async () => { await getUserInfo() };
  // }, []);

  /**
   * Returns loation based Default CardCodes for OTC & COD Customers from `context`
   * @param {*} isCODCustomer
   * @returns
   */
  const getLocationBasedDefaultCardCode = (isCODCustomer) => {
    const cardCode = isCODCustomer
      ? // return the Location based Default COD Customer Code
        userSessionLog?.locationDefaults?.U_CODCardCode
      : // return the Location based Default OTC Customer Code
        userSessionLog?.locationDefaults?.U_OTCCardCode;
    return cardCode;
  };

  return (
    <UserPermissionsContext.Provider
      value={{
        userPermissions,
        userName,
        userTIN,
        displayUserName,
        userId,
        statusCode,
        userSessionLog,
        storeWHCode,
        checkUserPermission,
        refreshUserInfo,
        setUserPermissions,
        setUserSessionLog,
        setStoreWHCode,
        setUserName,
        setUserTIN,
        setDisplayUserName,
        setUserId,
        setErrorStatusCode,
        getLocationBasedDefaultCardCode,
      }}
    >
      {children}
    </UserPermissionsContext.Provider>
  );
};
