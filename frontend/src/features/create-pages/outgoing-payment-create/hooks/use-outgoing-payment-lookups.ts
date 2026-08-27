import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import type { LookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import { rankAndLimitLookupOptions } from "@/features/create-pages/create-shared/utils/rank-lookup-options";

export function useOutgoingPaymentLookups() {
  const vendorsQuery = useQuery(createSharedQueries.vendors());

  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");

  const [nameFocused, setNameFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const vendorSelectedRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"vendor-name" | "vendor-code">("vendor-code");

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);

  const selectVendor = (vendor: LookupOption) => {
    vendorSelectedRef.current = true;
    setNameInput(vendor.name);
    setCodeInput(vendor.code);
    setNameFocused(false);
    setCodeFocused(false);
    setModalOpen(false);
  };

  const handleVendorNameChange = (value: string) => {
    vendorSelectedRef.current = false;
    setNameInput(value);
    if (value.trim() === "") {
      setNameFocused(true);
      setCodeInput("");
      return;
    }
    setNameFocused(true);
    setCodeInput("");
  };

  const handleVendorCodeChange = (value: string) => {
    vendorSelectedRef.current = false;
    setCodeInput(value);
    if (value.trim() === "") {
      setCodeFocused(true);
      setNameInput("");
      return;
    }
    setCodeFocused(true);
    setNameInput("");
  };

  useEffect(() => {
    if (!nameFocused && !codeFocused && !vendorSelectedRef.current) {
      setNameInput("");
      setCodeInput("");
    }
  }, [codeFocused, nameFocused]);

  const finalizeVendorLookup = () => {
    if (!vendorSelectedRef.current) {
      setNameInput("");
      setCodeInput("");
    }
    setNameFocused(false);
    setCodeFocused(false);
  };

  const nameSuggestions = useMemo(
    () => rankAndLimitLookupOptions(vendors as ProductLookupItem[], nameInput),
    [vendors, nameInput],
  );

  const codeSuggestions = useMemo(
    () => rankAndLimitLookupOptions(vendors as ProductLookupItem[], codeInput),
    [vendors, codeInput],
  );

  const openPopup = (mode: "vendor-name" | "vendor-code") => {
    setModalMode(mode);
    setModalOpen(true);
  };

  return {
    codeFocused,
    codeInput,
    codeSuggestions,
    handleVendorCodeChange,
    handleVendorNameChange,
    finalizeVendorLookup,
    modalMode,
    modalOpen,
    nameFocused,
    nameInput,
    nameSuggestions,
    openPopup,
    selectVendor,
    setCodeFocused,
    setCodeInput,
    setModalOpen,
    setNameFocused,
    setNameInput,
    vendors,
    vendorsQuery,
  };
}
