import { useState } from "react";

import type {
  PopupMode,
  StockPreviewProduct,
} from "@/features/create-pages/create-shared/utils/create-order.types";

export function useSqModals() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<PopupMode>("vendor-name");
  const [modalSearch, setModalSearch] = useState("");
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [stockPreviewProduct, setStockPreviewProduct] = useState<StockPreviewProduct | null>(null);

  const openPopup = (mode: PopupMode, getters: Record<string, string>) => {
    setModalMode(mode);
    if (mode === "vendor-name") {
      setModalSearch(getters.nameInput || "");
    }
    if (mode === "vendor-code") {
      setModalSearch(getters.codeInput || "");
    }
    if (mode === "warehouse") {
      setModalSearch(getters.warehouseInput || "");
    }
    if (mode === "sales-employee") {
      setModalSearch(getters.salesEmployeeInput || "");
    }
    if (mode === "branch") {
      setModalSearch(getters.branchInput || "");
    }
    setModalOpen(true);
  };

  const openStockPreview = (product: StockPreviewProduct) => {
    setStockPreviewProduct(product);
  };

  return {
    modalMode,
    modalOpen,
    modalSearch,
    openPopup,
    openStockPreview,
    productPopupOpen,
    productSearch,
    setModalMode,
    setModalOpen,
    setModalSearch,
    setProductPopupOpen,
    setProductSearch,
    setStockPreviewProduct,
    stockPreviewProduct,
  };
}
