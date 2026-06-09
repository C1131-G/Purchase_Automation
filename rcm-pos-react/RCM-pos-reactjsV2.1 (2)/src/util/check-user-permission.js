/**
 * Checks if the logged in user has the permission to View/Edit/Create/Delete a given module
 * @param {String} moduleName   Module which user tries to View/Edit/Create/Delete
 * @param {String} action       View/Edit/Create/Delete operation that user wants to perform on the given module
 * @param {Array}  permissions  User Permissions
 */
const checkUserPermission = (moduleName, action, permissions = []) => {
  let hasPermission = false;
  if (Array.isArray(permissions) && permissions.length > 0) {
    // if(localStorage.getItem("permissions")) {
    // const permissions = JSON.parse(localStorage.getItem("permissions"));
    for (let i = 0; i < permissions.length; i++) {
      if (
        ((Array.isArray(moduleName) && moduleName.includes(permissions[i].U_ModuleName)) ||
          permissions[i].U_ModuleName === moduleName) &&
        permissions[i][action] === "Y"
      ) {
        hasPermission = true;
        break;
      }
    }
  }
  return hasPermission;
};

export { checkUserPermission };
