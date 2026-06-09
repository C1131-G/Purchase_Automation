import { useContext } from "react";
import { UserPermissionsContext } from "../contexts/UserPermissionsContext";

export function useUserPermissions() {
  const { userPermissions, refreshUserInfo, checkUserPermission } =
    useContext(UserPermissionsContext);
  return { userPermissions, refreshUserInfo, checkUserPermission };
}
