/** File created for Hot Module Replacement (HMR) changes */
import React from "react";
import { HashRouter, BrowserRouter, Route, Switch, Redirect } from "react-router-dom";
import AdminLayout from "./layouts/Admin.js";
import POS from "./layouts/POS.js";
import GuestLayout from "./layouts/Guest.js";
import TestDemo from "./layouts/TestDemo.js";

import { UserPermissionsProvider } from "./contexts/UserPermissionsContext";
// import { useUserPermissions } from './hooks/useUserPermissions';

const browserRoutes = () => {
  return (
    // <BrowserRouter>
    <UserPermissionsProvider>
      <HashRouter>
        <Switch>
          <Route path="/u" render={(props) => <AdminLayout {...props} />} />
          <Route path="/g" render={(props) => <GuestLayout {...props} />} />
          <Route path="/pos" render={(props) => <POS {...props} />} />
          <Route path="/demo" render={(props) => <TestDemo {...props} />} />
          <Redirect from="/" to="/g/login" />
        </Switch>
      </HashRouter>
    </UserPermissionsProvider>
    //</BrowserRouter>
  );
};

export default browserRoutes;
