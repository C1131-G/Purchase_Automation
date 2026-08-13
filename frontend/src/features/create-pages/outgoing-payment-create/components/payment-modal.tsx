import { Calendar as CalendarIcon, CheckCircle2, Delete } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/features/dashboard/utils/formatters";
import type { ComponentProps, ReactElement } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";

import { Calendar } from "@/components/calendar/calendar";
import { LookupPopup } from "@/components/lookup/lookup-popup";
import { FieldBlock } from "@/features/create-pages/create-shared/components/core/field-block";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";

const TransferCalendar = Calendar as unknown as (
  props: ComponentProps<typeof Calendar> & { minDate?: Date; maxDate?: Date },
) => ReactElement;

interface PaymentCheck {
  BankCode: string;
  Branch: string;
  CheckNumber: number;
  CheckSum: number;
  CheckAccount?: string;
  CountryCode?: string;
  BankName?: string;
  GLAccount?: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  balanceDue: number;
  onPaymentSubmit: (paymentDetails: {
    PaymentChecks?: PaymentCheck[];
    CashAccount?: string | null;
    TransferSum?: number;
    TransferDate?: string;
    TransferAccount?: string;
    TransferReference?: string;
  }) => void;
  isPaymentOnAccount?: boolean;
  currencyCode?: string | undefined;
}

export function PaymentModal({
  open,
  onClose,
  balanceDue,
  onPaymentSubmit,
  isPaymentOnAccount,
  currencyCode,
}: PaymentModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeTab, setActiveTab] = useState<"Cash" | "Cheque" | "Bank Transfer">("Cash");

  const [fullTab, setFullTab] = useState<"Cash" | "Cheque" | "Bank Transfer" | null>(null);
  const [fullTabThreshold, setFullTabThreshold] = useState<number>(0);

  const [cashAmount, setCashAmount] = useState<string>("");
  const [accountInput, setAccountInput] = useState("");
  const [accountFocused, setAccountFocused] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [chequeAmount, setChequeAmount] = useState<string>("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeBranch, setChequeBranch] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [isAccountLookupOpen, setAccountLookupOpen] = useState(false);
  const [bankCountryCode, setBankCountryCode] = useState("");
  const [bankCountryCodeFocused, setBankCountryCodeFocused] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankNameFocused, setBankNameFocused] = useState(false);
  const [chequeAccount, setChequeAccount] = useState("");
  const [chequeAccountFocused, setChequeAccountFocused] = useState(false);
  const [chequeGLAccount, setChequeGLAccount] = useState("");
  const [chequeGLAccountFocused, setChequeGLAccountFocused] = useState(false);
  const [manualCheckNo, setManualCheckNo] = useState(false);
  const [chequeIssuedBy, setChequeIssuedBy] = useState("");
  const [isCountryLookupOpen, setCountryLookupOpen] = useState(false);
  const [isBankNameLookupOpen, setBankNameLookupOpen] = useState(false);
  const [isChequeAccountLookupOpen, setChequeAccountLookupOpen] = useState(false);
  const [isChequeGLAccountLookupOpen, setChequeGLAccountLookupOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(toISODate(new Date()));
  const [transferReference, setTransferReference] = useState("");
  const [transferDatePickerOpen, setTransferDatePickerOpen] = useState(false);
  const transferDateContainerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    position: "fixed",
    zIndex: 999999,
  });

  const updatePopoverPosition = () => {
    if (!transferDateContainerRef.current) return;
    const rect = transferDateContainerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const calendarHeight = 310; // slightly conservative height to prevent clipping
    const calendarWidth = 270;
    const margin = 8;

    const shouldFlip = spaceBelow < calendarHeight && rect.top > calendarHeight;

    const top = shouldFlip ? rect.top - calendarHeight - margin : rect.bottom + margin;
    const left = Math.min(rect.left, window.innerWidth - calendarWidth - 16);

    setPopoverStyle({
      position: "fixed",
      zIndex: 999999,
      top: `${top}px`,
      left: `${left}px`,
    });
  };

  useEffect(() => {
    if (!transferDatePickerOpen) {
      return;
    }
    updatePopoverPosition();
    const handleScroll = () => updatePopoverPosition();
    const handleResize = () => updatePopoverPosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [transferDatePickerOpen]);

  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bankCountryFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bankNameFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chequeAccountFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chequeGLAccountFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const { data: accountData, isLoading: isLoadingAccounts } = useQuery({
    ...outgoingPaymentQueries.accountSuggestions(accountInput || undefined, 20),
  });

  const accountSuggestions: CreateLookupOption[] = (accountData?.data ?? []).map((acc) => ({
    code: acc.GLAccount,
    name: acc.Account,
  }));

  const { data: bankData, isLoading: isLoadingBanks } = useQuery({
    ...outgoingPaymentQueries.bankSuggestions(undefined, 200),
    enabled: activeTab === "Cheque",
  });

  const { data: transferAccountData, isLoading: isLoadingTransferAccount } = useQuery({
    ...outgoingPaymentQueries.transferAccount(transferDate),
    enabled: activeTab === "Bank Transfer" && !!transferDate && (Number(transferAmount) || 0) > 0,
  });

  const resolvedTransferAccount = transferAccountData?.data?.TransferAccount ?? "";

  const bankRecords = bankData?.data ?? [];

  const countryCodeSuggestions: CreateLookupOption[] = useMemo(() => {
    const unique = [...new Set(bankRecords.map((b) => b.CountryCode))].filter(Boolean);
    return unique.map((code) => ({ code, name: code }));
  }, [bankRecords]);

  const bankNameSuggestions: CreateLookupOption[] = useMemo(() => {
    if (!bankCountryCode) return [];
    const filtered = bankRecords.filter((b) => b.CountryCode === bankCountryCode);
    return filtered.map((b) => ({ code: b.BankCode, name: b.BankName }));
  }, [bankRecords, bankCountryCode]);

  const handleAccountChange = (value: string) => {
    setAccountInput(value);
    if (value.trim() === "") {
      setSelectedAccount(null);
      return;
    }
    const matched = accountSuggestions.find((a) => a.code.toLowerCase() === value.toLowerCase());
    if (matched) {
      selectAccount(matched);
      return;
    }
    setAccountFocused(true);
  };

  const selectAccount = (item: CreateLookupOption) => {
    setAccountInput(item.code);
    setSelectedAccount(item.code);
    setAccountFocused(false);
    setAccountLookupOpen(false);
  };

  const accountLookupItems: LookupItem[] = accountSuggestions.map((s) => ({
    code: s.code,
    name: s.name,
  }));

  const countryLookupItems: LookupItem[] = countryCodeSuggestions.map((s) => ({
    code: s.code,
    name: s.name,
  }));

  const bankNameLookupItems: LookupItem[] = bankNameSuggestions.map((s) => ({
    code: s.code,
    name: s.name,
  }));

  const chequeAccountOptions: CreateLookupOption[] = useMemo(
    () => accountSuggestions.map((a) => ({ code: a.code, name: a.code })),
    [accountSuggestions],
  );

  const chequeAccountLookupItems: LookupItem[] = chequeAccountOptions.map((s) => ({
    code: s.code,
    name: s.name,
  }));

  const resetAllFields = () => {
    setCashAmount("");
    setAccountInput("");
    setAccountFocused(false);
    setSelectedAccount(null);
    setChequeAmount("");
    setBankCountryCode("");
    setBankName("");
    setChequeAccount("");
    setChequeGLAccount("");
    setChequeIssuedBy("");
    setChequeBranch("");
    setChequeNo("");
    setManualCheckNo(false);
    setCountryLookupOpen(false);
    setBankNameLookupOpen(false);
    setChequeAccountLookupOpen(false);
    setChequeGLAccountLookupOpen(false);
    setTransferAmount("");
    setTransferDate(toISODate(new Date()));
    setTransferReference("");
    setTransferDatePickerOpen(false);
    setActiveTab("Cash");
    setFullTab(null);
    setFullTabThreshold(0);
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        resetAllFields();
      }, 0);
      return () => {
        clearTimeout(timer);
        clearTimeout(focusTimeoutRef.current);
        clearTimeout(bankCountryFocusTimeoutRef.current);
        clearTimeout(bankNameFocusTimeoutRef.current);
        clearTimeout(chequeAccountFocusTimeoutRef.current);
        clearTimeout(chequeGLAccountFocusTimeoutRef.current);
      };
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        transferDatePickerOpen &&
        transferDateContainerRef.current &&
        !transferDateContainerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setTransferDatePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [transferDatePickerOpen]);

  if (!open) {
    return null;
  }

  const getActiveAmount = () => {
    if (activeTab === "Cash") return cashAmount;
    if (activeTab === "Cheque") return chequeAmount;
    return transferAmount;
  };

  const setActiveAmount = (val: string) => {
    if (activeTab === "Cash") {
      setCashAmount(val);
    } else if (activeTab === "Cheque") {
      setChequeAmount(val);
    } else {
      setTransferAmount(val);
    }
  };

  const handlePayFull = () => {
    const cash = Number(cashAmount) || 0;
    const cheque = Number(chequeAmount) || 0;
    const transfer = Number(transferAmount) || 0;
    const totalCurrentPayments = cash + cheque + transfer;
    const remaining = balanceDue - totalCurrentPayments;

    if (remaining <= 0) {
      return;
    }

    const otherTabsTotal =
      totalCurrentPayments -
      (activeTab === "Cash" ? cash : activeTab === "Cheque" ? cheque : transfer);
    const threshold = balanceDue - otherTabsTotal;
    setFullTabThreshold(threshold);
    setFullTab(activeTab);

    if (activeTab === "Cash") {
      setCashAmount((Number(cashAmount) + remaining).toFixed(2));
    } else if (activeTab === "Cheque") {
      setChequeAmount(remaining.toFixed(2));
    } else {
      setTransferAmount(remaining.toFixed(2));
    }
  };

  const handleReset = () => {
    setActiveAmount("");
    if (fullTab === activeTab) {
      setFullTab(null);
      setFullTabThreshold(0);
    }
  };

  const handleKeypadPress = (digit: string) => {
    const current = getActiveAmount();
    if ((current === "" || current === "0") && digit !== ".") {
      setActiveAmount(digit);
      if (fullTab === activeTab && Number(digit) < fullTabThreshold) {
        setFullTab(null);
        setFullTabThreshold(0);
      }
      return;
    }
    if (digit === "." && current.includes(".")) {
      return;
    }
    if (current.includes(".")) {
      const parts = current.split(".");
      if (parts[1] && parts[1].length >= 2) {
        return;
      }
    }
    const newAmount = current + digit;
    setActiveAmount(newAmount);
    if (fullTab === activeTab && Number(newAmount) < fullTabThreshold) {
      setFullTab(null);
      setFullTabThreshold(0);
    }
  };

  const handleBackspace = () => {
    const current = getActiveAmount();
    if (current.length <= 1 || current === "") {
      setActiveAmount("");
      if (fullTab === activeTab) {
        setFullTab(null);
        setFullTabThreshold(0);
      }
    } else {
      const newAmount = current.slice(0, -1);
      setActiveAmount(newAmount);
      if (fullTab === activeTab && Number(newAmount) < fullTabThreshold) {
        setFullTab(null);
        setFullTabThreshold(0);
      }
    }
  };

  const handleSubmit = () => {
    const cash = Number(cashAmount) || 0;
    const cheque = Number(chequeAmount) || 0;
    const transfer = Number(transferAmount) || 0;

    const paymentChecks: PaymentCheck[] = [];

    if (cheque > 0) {
      const chequeCheck: PaymentCheck = {
        BankCode: chequeBank || "CASH",
        Branch: chequeBranch || "LABASA",
        CheckNumber: Number(chequeNo) || 1,
        CheckSum: cheque,
      };
      if (chequeGLAccount) chequeCheck.CheckAccount = chequeGLAccount;
      if (bankCountryCode) chequeCheck.CountryCode = bankCountryCode;
      if (bankName) chequeCheck.BankName = bankName;
      paymentChecks.push(chequeCheck);
    }

    if (cash > 0) {
      paymentChecks.push({
        BankCode: "CASH",
        Branch: "Vendor Portal",
        CheckNumber: 1,
        CheckSum: cash,
        CheckAccount: selectedAccount || "",
      });
    }

    const paymentDetails: {
      PaymentChecks?: PaymentCheck[];
      CashAccount?: string | null;
      TransferSum?: number;
      TransferDate?: string;
      TransferAccount?: string;
      TransferReference?: string;
    } = {};

    if (cash > 0 && selectedAccount) {
      paymentDetails.CashAccount = selectedAccount;
    }

    if (transfer > 0) {
      paymentDetails.TransferSum = transfer;
      paymentDetails.TransferDate = transferDate;
      if (resolvedTransferAccount) {
        paymentDetails.TransferAccount = resolvedTransferAccount;
      }
      paymentDetails.TransferReference = transferReference.trim();
    }

    if (paymentChecks.length > 0) {
      paymentDetails.PaymentChecks = paymentChecks;
    }

    onPaymentSubmit(paymentDetails);
    resetAllFields();
    onClose();
  };

  const totalPaid =
    (Number(cashAmount) || 0) + (Number(chequeAmount) || 0) + (Number(transferAmount) || 0);
  const remainingBalance = balanceDue - totalPaid;

  const isTabFull = (tab: "Cash" | "Cheque" | "Bank Transfer") => fullTab === tab;
  const isPayFullDisabled = (tab: "Cash" | "Cheque" | "Bank Transfer") =>
    fullTab !== null && fullTab !== tab;

  const handleAction = () => {
    if (isTabFull(activeTab)) {
      handleReset();
    } else {
      handlePayFull();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-surface shadow-xl flex flex-col max-h-[90vh] overflow-hidden cursor-pointer">
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800"></h2>
            <div className="flex gap-3 text-sm">
              {balanceDue > 0 && (
                <div className="flex gap-1.5">
                  <span className="text-teal-400 font-medium">Invoice:</span>
                  <span className="font-bold text-teal-400">
                    {formatCurrency(balanceDue, currencyCode)}
                  </span>
                </div>
              )}
              {(balanceDue > 0 || !isPaymentOnAccount) && (
                <div className="flex gap-1.5">
                  <span className="text-orange-500 font-medium">
                    {remainingBalance < 0 ? "On Account:" : "Balance:"}
                  </span>
                  <span className="font-bold text-orange-500">
                    {formatCurrency(Math.abs(remainingBalance), currencyCode)}
                  </span>
                </div>
              )}
              <div className="flex gap-1.5">
                <span className="text-emerald-500 font-medium">Paid:</span>
                <span className="font-bold text-emerald-500">
                  {formatCurrency(totalPaid, currencyCode)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(["Cash", "Cheque", "Bank Transfer"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "bg-teal-600 text-surface"
                    : "bg-surface text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-2 flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 h-[380px]">
            {activeTab === "Cash" ? (
              <div className="flex gap-4 border border-slate-100 rounded-xl p-3 h-full cursor-pointer">
                <div className="w-[260px] flex-shrink-0">
                  <button
                    onClick={handleAction}
                    disabled={isPayFullDisabled("Cash")}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-xs font-semibold mb-2 shadow-sm transition-all cursor-pointer ${
                      isTabFull("Cash")
                        ? "bg-rose-500 hover:bg-rose-600"
                        : "bg-teal-600 hover:bg-teal-700"
                    } ${isPayFullDisabled("Cash") ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isTabFull("Cash") ? "Reset" : "PAY FULL"}
                    {!isTabFull("Cash") && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="mb-2">
                    <input
                      type="text"
                      value={getActiveAmount()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(val)) {
                          setActiveAmount(val);
                          if (fullTab === "Cash" && Number(val) < fullTabThreshold) {
                            setFullTab(null);
                            setFullTabThreshold(0);
                          }
                        }
                      }}
                      placeholder="Enter amount"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base text-slate-700 outline-none bg-field-silver focus:bg-surface focus:border-teal-300 focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, ".", "back"].map((key) =>
                      key === "back" ? (
                        <button
                          key="back"
                          onClick={handleBackspace}
                          className="bg-rose-500 hover:bg-rose-600 text-surface flex items-center justify-center py-3 rounded-lg"
                        >
                          <Delete className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          key={key}
                          onClick={() => handleKeypadPress(key.toString())}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xl font-bold py-2.5 rounded-lg"
                        >
                          {key}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col animate-in fade-in">
                  <div className="relative">
                    <FieldBlock
                      label="Cash Account *"
                      placeholder="Select or Type"
                      value={accountInput}
                      onChange={handleAccountChange}
                      onFocus={() => setAccountFocused(true)}
                      onBlur={() => {
                        focusTimeoutRef.current = setTimeout(() => setAccountFocused(false), 120);
                      }}
                      onOpenPopup={() => {
                        clearTimeout(focusTimeoutRef.current);
                        setAccountLookupOpen(true);
                      }}
                      loading={isLoadingAccounts}
                    />
                    {accountFocused && (
                      <SuggestionList
                        items={accountSuggestions}
                        onSelect={selectAccount}
                        floating
                        showCode
                        codeLabel="GLAccount"
                        nameLabel="Account"
                        emptyText="No accounts found"
                        maxHeight="max-h-[200px]"
                        query={accountInput}
                        scrollable={false}
                      />
                    )}
                  </div>

                  <div className="mt-2 text-left text-slate-400">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span>Enter amount on the keypad</span>
                      <span>&bull;</span>
                      <span>Select account</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "Cheque" ? (
              <div className="border border-slate-100 rounded-xl p-3 h-full cursor-pointer">
                <div className="flex items-center gap-4 pb-3 mb-3 border-b border-slate-100">
                  <input
                    type="number"
                    value={chequeAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val)) {
                        setChequeAmount(val);
                        if (fullTab === "Cheque" && Number(val) < fullTabThreshold) {
                          setFullTab(null);
                          setFullTabThreshold(0);
                        }
                      }
                    }}
                    placeholder="Enter amount"
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-300 focus:bg-surface focus:ring-2 focus:ring-teal-200 outline-none w-40 bg-field-silver"
                  />
                  <button
                    onClick={handleAction}
                    disabled={isPayFullDisabled("Cheque")}
                    className={`flex items-center justify-center gap-1.5 min-w-[130px] px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
                      isTabFull("Cheque")
                        ? "bg-rose-500 hover:bg-rose-600"
                        : "bg-teal-600 hover:bg-teal-700"
                    } ${isPayFullDisabled("Cheque") ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isTabFull("Cheque") ? "Reset" : "PAY FULL"}
                    {!isTabFull("Cheque") && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <FieldBlock
                      label="Country Code"
                      placeholder="Search country code..."
                      value={bankCountryCode}
                      onChange={(v) => setBankCountryCode(v)}
                      onFocus={() => setBankCountryCodeFocused(true)}
                      onBlur={() => {
                        bankCountryFocusTimeoutRef.current = setTimeout(
                          () => setBankCountryCodeFocused(false),
                          120,
                        );
                      }}
                      onOpenPopup={() => {
                        clearTimeout(bankCountryFocusTimeoutRef.current);
                        setCountryLookupOpen(true);
                      }}
                      loading={isLoadingBanks}
                    />
                    {bankCountryCodeFocused && (
                      <SuggestionList
                        items={countryCodeSuggestions}
                        onSelect={(item) => {
                          setBankCountryCode(item.code);
                          setBankCountryCodeFocused(false);
                          setBankName("");
                        }}
                        floating
                        nameLabel="Code"
                        emptyText="No country codes found"
                        maxHeight="max-h-[150px]"
                        query={bankCountryCode}
                        scrollable={false}
                      />
                    )}
                  </div>
                  <div className="relative">
                    <FieldBlock
                      label="Bank Name"
                      placeholder="Search bank name..."
                      value={bankName}
                      onChange={(v) => setBankName(v)}
                      onFocus={() => setBankNameFocused(true)}
                      onBlur={() => {
                        bankNameFocusTimeoutRef.current = setTimeout(
                          () => setBankNameFocused(false),
                          120,
                        );
                      }}
                      onOpenPopup={() => {
                        clearTimeout(bankNameFocusTimeoutRef.current);
                        setBankNameLookupOpen(true);
                      }}
                    />
                    {bankNameFocused && (
                      <SuggestionList
                        items={bankNameSuggestions}
                        onSelect={(item) => {
                          setBankName(item.name);
                          setChequeBank(item.code);
                          setBankNameFocused(false);
                        }}
                        floating
                        emptyText="No banks found"
                        maxHeight="max-h-[150px]"
                        query={bankName}
                        scrollable={false}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={chequeBranch}
                      onChange={(e) => setChequeBranch(e.target.value)}
                      placeholder="Enter branch"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-300 focus:bg-surface focus:ring-2 focus:ring-teal-200 outline-none bg-field-silver"
                    />
                  </div>
                  <div className="relative">
                    <FieldBlock
                      label="Account Number"
                      placeholder="Search account..."
                      value={chequeAccount}
                      onChange={(v) => setChequeAccount(v)}
                      onFocus={() => setChequeAccountFocused(true)}
                      onBlur={() => {
                        chequeAccountFocusTimeoutRef.current = setTimeout(
                          () => setChequeAccountFocused(false),
                          120,
                        );
                      }}
                      onOpenPopup={() => {
                        clearTimeout(chequeAccountFocusTimeoutRef.current);
                        setChequeAccountLookupOpen(true);
                      }}
                      loading={isLoadingAccounts}
                    />
                    {chequeAccountFocused && (
                      <SuggestionList
                        items={accountSuggestions}
                        onSelect={(item) => {
                          setChequeAccount(item.name);
                          setChequeGLAccount(item.code);
                          setChequeAccountFocused(false);
                        }}
                        containerClassName="absolute left-0 right-0 bottom-full z-30 mb-2 overflow-hidden rounded-xl border border-linen-200 bg-surface shadow-lg"
                        nameLabel="Account"
                        emptyText="No accounts found"
                        maxHeight="max-h-[150px]"
                        query={chequeAccount}
                        scrollable={false}
                      />
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div className="w-[196.54px]">
                      <label className="flex items-center gap-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        <input
                          type="checkbox"
                          checked={manualCheckNo}
                          onChange={(e) => {
                            setManualCheckNo(e.target.checked);
                            if (!e.target.checked) setChequeNo("");
                          }}
                          className="w-3 h-3 text-teal-500 rounded border-slate-300"
                        />
                        Cheque Number
                      </label>
                      <input
                        type="text"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        placeholder="Enter cheque number"
                        disabled={!manualCheckNo}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-300 focus:bg-surface focus:ring-2 focus:ring-teal-200 outline-none bg-field-silver disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] mb-1 font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Issued By
                      </label>
                      <input
                        type="text"
                        value={chequeIssuedBy}
                        onChange={(e) => setChequeIssuedBy(e.target.value)}
                        placeholder="Enter issued by"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-300 focus:bg-surface focus:ring-2 focus:ring-teal-200 outline-none bg-field-silver"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <FieldBlock
                      label="GL Account"
                      placeholder="Search GL account..."
                      value={chequeGLAccount}
                      onChange={(v) => setChequeGLAccount(v)}
                      onFocus={() => setChequeGLAccountFocused(true)}
                      onBlur={() => {
                        chequeGLAccountFocusTimeoutRef.current = setTimeout(
                          () => setChequeGLAccountFocused(false),
                          120,
                        );
                      }}
                      onOpenPopup={() => {
                        clearTimeout(chequeGLAccountFocusTimeoutRef.current);
                        setChequeGLAccountLookupOpen(true);
                      }}
                      loading={isLoadingAccounts}
                    />
                    {chequeGLAccountFocused && (
                      <SuggestionList
                        items={chequeAccountOptions}
                        onSelect={(item) => {
                          setChequeGLAccount(item.code);
                          setChequeGLAccountFocused(false);
                        }}
                        containerClassName="absolute left-0 right-0 bottom-full z-30 mb-2 overflow-hidden rounded-xl border border-linen-200 bg-surface shadow-lg"
                        nameLabel="GLAccount"
                        emptyText="No accounts found"
                        maxHeight="max-h-[150px]"
                        query={chequeGLAccount}
                        scrollable={false}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl p-3 h-full cursor-pointer">
                <div className="flex items-center gap-4 pb-3 mb-3 border-b border-slate-100">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val)) {
                        setTransferAmount(val);
                        if (fullTab === "Bank Transfer" && Number(val) < fullTabThreshold) {
                          setFullTab(null);
                          setFullTabThreshold(0);
                        }
                      }
                    }}
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-300 focus:bg-surface focus:ring-2 focus:ring-teal-200 outline-none w-40 bg-field-silver"
                    placeholder="Transfer amount"
                  />
                  <button
                    onClick={handleAction}
                    disabled={isPayFullDisabled("Bank Transfer")}
                    className={`flex items-center justify-center gap-1.5 min-w-[130px] px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
                      isTabFull("Bank Transfer")
                        ? "bg-rose-500 hover:bg-rose-600"
                        : "bg-teal-600 hover:bg-teal-700"
                    } ${isPayFullDisabled("Bank Transfer") ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isTabFull("Bank Transfer") ? "Reset" : "PAY FULL"}
                    {!isTabFull("Bank Transfer") && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="transferDate"
                      className="mb-1.5 block text-xs font-bold text-neutral-500"
                    >
                      Transfer Date
                    </label>
                    <div ref={transferDateContainerRef} className="relative">
                      <button
                        id="transferDate"
                        type="button"
                        onClick={() =>
                          setTransferDatePickerOpen((prev) => (prev === true ? false : true))
                        }
                        className="relative flex h-10 w-full items-center justify-start rounded-xl border border-linen-200 bg-field-silver pl-3 pr-10 text-sm text-ink-900 outline-none transition hover:bg-surface focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                      >
                        <span>{toDisplayDate(transferDate)}</span>
                        <div className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition hover:bg-linen-100">
                          <CalendarIcon className="h-3 w-3" />
                        </div>
                      </button>
                      {transferDatePickerOpen &&
                        createPortal(
                          <div
                            ref={popoverRef}
                            style={popoverStyle}
                            className="bg-surface rounded-xl border border-linen-200 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <TransferCalendar
                              mode="single"
                              selected={parseISODate(transferDate)}
                              maxDate={today}
                              onSelect={(value) => {
                                if (!(value instanceof Date)) {
                                  return;
                                }
                                setTransferDate(toISODate(value));
                                setTransferDatePickerOpen(false);
                              }}
                            />
                          </div>,
                          document.body,
                        )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-neutral-500">
                      GL Account (Transfer)
                    </label>
                    <div className="flex h-10 w-full items-center rounded-xl border border-linen-200 bg-linen-100 px-3 text-sm text-neutral-500">
                      {isLoadingTransferAccount ? (
                        <span className="animate-pulse">Resolving...</span>
                      ) : resolvedTransferAccount ? (
                        <span className="font-medium text-ink-900">{resolvedTransferAccount}</span>
                      ) : (
                        <span>Select date to resolve</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label
                    htmlFor="transferReference"
                    className="mb-1.5 block text-xs font-bold text-neutral-500"
                  >
                    Reference
                  </label>
                  <input
                    id="transferReference"
                    type="text"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    placeholder="Enter transfer reference"
                    className="w-full max-w-[280px] rounded-xl border border-linen-200 bg-field-silver px-3 py-2.5 text-sm text-ink-900 outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex-shrink-0 px-4 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              resetAllFields();
              onClose();
            }}
            className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(() => {
              const totalEntered =
                (Number(cashAmount) || 0) +
                (Number(chequeAmount) || 0) +
                (Number(transferAmount) || 0);
              if (totalEntered <= 0) {
                return true;
              }
              if (!isPaymentOnAccount && balanceDue > 0 && totalEntered > balanceDue + 0.01) {
                return true;
              }
              const cash = Number(cashAmount) || 0;
              const cheque = Number(chequeAmount) || 0;
              const transfer = Number(transferAmount) || 0;
              if (cash > 0 && !selectedAccount) {
                return true;
              }
              if (cheque > 0 && !chequeBank) {
                return true;
              }
              if (transfer > 0 && transferReference.trim() === "") {
                return true;
              }
              return false;
            })()}
            className="bg-teal-600 text-surface px-10 py-2 rounded-lg text-sm font-semibold shadow-md hover:bg-teal-700 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
          >
            SUBMIT PAYMENT
          </button>
        </div>
      </div>

      <LookupPopup
        open={isAccountLookupOpen}
        search={accountInput}
        results={accountLookupItems}
        loading={isLoadingAccounts}
        error={null}
        codeLabel="GLAccount"
        nameLabel="Account"
        title="Select Cash Account"
        searchPlaceholder="Search account..."
        onSearchChange={(v) => setAccountInput(v)}
        onClose={() => setAccountLookupOpen(false)}
        onSelect={(item) => selectAccount({ code: item.code, name: item.name })}
      />

      <LookupPopup
        open={isCountryLookupOpen}
        search={bankCountryCode}
        results={countryLookupItems}
        loading={isLoadingBanks}
        error={null}
        mode="vendor-code"
        title="Select Country Code"
        searchPlaceholder="Search country code..."
        onSearchChange={(v) => setBankCountryCode(v)}
        onClose={() => setCountryLookupOpen(false)}
        onSelect={(item) => {
          setBankCountryCode(item.code);
          setBankName("");
          setCountryLookupOpen(false);
        }}
      />

      <LookupPopup
        open={isBankNameLookupOpen}
        search={bankName}
        results={bankNameLookupItems}
        loading={isLoadingBanks}
        error={null}
        mode="vendor-name"
        title="Select Bank Name"
        searchPlaceholder="Search bank name..."
        onSearchChange={(v) => setBankName(v)}
        onClose={() => setBankNameLookupOpen(false)}
        onSelect={(item) => {
          setBankName(item.name);
          setChequeBank(item.code);
          setBankNameLookupOpen(false);
        }}
      />

      <LookupPopup
        open={isChequeAccountLookupOpen}
        search={chequeAccount}
        results={accountLookupItems}
        loading={isLoadingAccounts}
        error={null}
        mode="vendor-name"
        nameLabel="Account"
        title="Select Account"
        searchPlaceholder="Search Account..."
        onSearchChange={(v) => setChequeAccount(v)}
        onClose={() => setChequeAccountLookupOpen(false)}
        onSelect={(item) => {
          setChequeAccount(item.name);
          setChequeGLAccount(item.code);
          setChequeAccountLookupOpen(false);
        }}
      />

      <LookupPopup
        open={isChequeGLAccountLookupOpen}
        search={chequeGLAccount}
        results={chequeAccountLookupItems}
        loading={isLoadingAccounts}
        error={null}
        mode="vendor-code"
        codeLabel="GLAccount"
        title="Select GL Account"
        searchPlaceholder="Search GL Account..."
        onSearchChange={(v) => setChequeGLAccount(v)}
        onClose={() => setChequeGLAccountLookupOpen(false)}
        onSelect={(item) => {
          setChequeGLAccount(item.code);
          setChequeGLAccountLookupOpen(false);
        }}
      />
    </div>
  );
}
