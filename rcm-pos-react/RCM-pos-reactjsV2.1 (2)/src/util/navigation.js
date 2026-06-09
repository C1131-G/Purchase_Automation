import { appPaths } from "../config/config.js";

export const openHomePage = (history) => {
  history.push(appPaths.HOME);
};

export const openViewInvoicePage = (history) => {
  history.push(appPaths.VIEW_INVOICE);
};

export const openCreateInvoicePage = (history) => {
  history.push(appPaths.CREATE_INVOICE);
};

export const openViewSalesQuotationPage = (history) => {
  history.push(appPaths.VIEW_QUOTATION);
};
export const openCreateSalesQuotationPage = (history) => {
  history.push(appPaths.CREATE_QUOTATION);
};

export const openViewReturnsPage = (history) => {
  history.push(appPaths.VIEW_RETURNS);
};

export const openCreateReturnsPage = (history) => {
  history.push(appPaths.CREATE_RETURNS);

  /**
   * SAMPLE - To pass value via history.push():
   * 
   * history.push('/other-page', { customData: 'This is some custom data' });
   * 
   * In the target component where you want to access the state:
   * 
      function OtherPage() {
        const location = useLocation();
        const state = location.state;

        return(
           <p>Custom Data: {state && state.customData}</p>
        );
      }
   * 
   */
};
