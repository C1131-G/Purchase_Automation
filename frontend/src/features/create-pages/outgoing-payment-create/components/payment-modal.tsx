import { CheckCircle2, Delete } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import { FieldBlock } from "@/features/create-pages/create-shared/components/core/field-block";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";

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
  }) => void;
  isPaymentOnAccount?: boolean;
}

export function PaymentModal({
  open,
  onClose,
  balanceDue,
  onPaymentSubmit,
  isPaymentOnAccount,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"Cash" | "Cheque">("Cash");

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

  const bankRecords = bankData?.data ?? [];

  const countryCodeSuggestions: CreateLookupOption[] = useMemo(() => {
    const unique = [...new Set(bankRecords.map((b) => b.CountryCod))].filter(Boolean);
    return unique.map((code) => ({ code, name: code }));
  }, [bankRecords]);

  const bankNameSuggestions: CreateLookupOption[] = useMemo(() => {
    if (!bankCountryCode) return [];
    return bankRecords
      .filter((b) => b.CountryCod === bankCountryCode)
      .map((b) => ({ code: b.BankCode, name: b.BankName }));
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

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
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
        setActiveTab("Cash");
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

  if (!open) {
    return null;
  }

  const getActiveAmount = () => {
    return activeTab === "Cash" ? cashAmount : chequeAmount;
  };

  const setActiveAmount = (val: string) => {
    if (activeTab === "Cash") {
      setCashAmount(val);
    } else {
      setChequeAmount(val);
    }
  };

  const handlePayFull = () => {
    const cash = Number(cashAmount) || 0;
    const cheque = Number(chequeAmount) || 0;
    const totalCurrentPayments = cash + cheque;
    const remaining = balanceDue - totalCurrentPayments;

    if (remaining <= 0) {
      return;
    }

    if (activeTab === "Cash") {
      setCashAmount((Number(cashAmount) + remaining).toFixed(2));
    } else {
      setChequeAmount(remaining.toFixed(2));
    }
  };

  const handleReset = () => {
    setActiveAmount("");
  };

  const handleKeypadPress = (digit: string) => {
    const current = getActiveAmount();
    if ((current === "" || current === "0") && digit !== ".") {
      setActiveAmount(digit);
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
    setActiveAmount(current + digit);
  };

  const handleBackspace = () => {
    const current = getActiveAmount();
    if (current.length <= 1 || current === "") {
      setActiveAmount("");
    } else {
      setActiveAmount(current.slice(0, -1));
    }
  };

  const handleSubmit = () => {
    const cash = Number(cashAmount) || 0;
    const cheque = Number(chequeAmount) || 0;

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
    } = {};

    if (cash > 0 && selectedAccount) {
      paymentDetails.CashAccount = selectedAccount;
    }

    if (paymentChecks.length > 0) {
      paymentDetails.PaymentChecks = paymentChecks;
    }

    console.log("[DEBUG-cheque] Frontend payload:", JSON.stringify(paymentDetails, null, 2));

    onPaymentSubmit(paymentDetails);
    onClose();
  };

  const totalPaid = (Number(cashAmount) || 0) + (Number(chequeAmount) || 0);
  const remainingBalance = balanceDue - totalPaid;

  const showReset = remainingBalance <= 0;

  const handleAction = () => {
    if (showReset) {
      handleReset();
    } else {
      handlePayFull();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800"></h2>
            <div className="flex gap-3 text-sm">
              {balanceDue > 0 && (
                <div className="flex gap-1.5">
                  <span className="text-blue-400 font-medium">Invoice:</span>
                  <span className="font-bold text-blue-400">FJD {balanceDue.toFixed(2)}</span>
                </div>
              )}
              {(balanceDue > 0 || !isPaymentOnAccount) && (
                <div className="flex gap-1.5">
                  <span className="text-orange-500 font-medium">
                    {remainingBalance < 0 ? "On Account:" : "Balance:"}
                  </span>
                  <span className="font-bold text-orange-500">
                    FJD {Math.abs(remainingBalance).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex gap-1.5">
                <span className="text-emerald-500 font-medium">Paid:</span>
                <span className="font-bold text-emerald-500">FJD {totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(["Cash", "Cheque"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 flex-1 overflow-visible min-h-[340px]">
          {activeTab === "Cash" ? (
            <div className="flex gap-4 border border-slate-100 rounded-xl p-3 h-full">
              <div className="w-[260px] flex-shrink-0">
                <button
                  onClick={handleAction}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-xs font-semibold mb-2 shadow-sm transition-all cursor-pointer ${
                    showReset ? "bg-rose-500 hover:bg-rose-600" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {showReset ? "Reset" : "PAY FULL"}
                  {!showReset && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <div className="mb-2">
                  <input
                    type="text"
                    value={getActiveAmount()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val)) {
                        setActiveAmount(val);
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base text-slate-700 outline-none bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, ".", "back"].map((key) =>
                    key === "back" ? (
                      <button
                        key="back"
                        onClick={handleBackspace}
                        className="bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center py-3 rounded-lg"
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
          ) : (
            <div className="border border-slate-100 rounded-xl p-3 h-full">
              <div className="flex items-center gap-4 pb-3 mb-3 border-b border-slate-100">
                <input
                  type="number"
                  value={chequeAmount}
                  onChange={(e) => setChequeAmount(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none w-40 bg-white"
                />
                <button
                  onClick={handleAction}
                  className={`flex items-center justify-center gap-1.5 min-w-[130px] px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
                    showReset ? "bg-rose-500 hover:bg-rose-600" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {showReset ? "Reset" : "PAY FULL"}
                  {!showReset && <CheckCircle2 className="w-3.5 h-3.5" />}
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
                  <label className="block text-[10px] mb-1 font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={chequeBranch}
                    onChange={(e) => setChequeBranch(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
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
                      floating
                      nameLabel="Account"
                      emptyText="No accounts found"
                      maxHeight="max-h-[150px]"
                      query={chequeAccount}
                      scrollable={false}
                    />
                  )}
                </div>
                <div className="flex gap-3">
                  <div>
                    <label className="flex items-center gap-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      <input
                        type="checkbox"
                        checked={manualCheckNo}
                        onChange={(e) => {
                          setManualCheckNo(e.target.checked);
                          if (!e.target.checked) setChequeNo("");
                        }}
                        className="w-3 h-3 text-blue-500 rounded border-slate-300"
                      />
                      Check Number
                    </label>
                    <input
                      type="text"
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                      disabled={!manualCheckNo}
                      className="w-28 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] mb-1 font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Issued By
                    </label>
                    <input
                      type="text"
                      value={chequeIssuedBy}
                      onChange={(e) => setChequeIssuedBy(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
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
                      containerClassName="absolute left-0 right-0 bottom-full z-30 mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
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
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(() => {
              const totalEntered = (Number(cashAmount) || 0) + (Number(chequeAmount) || 0);
              if (totalEntered <= 0) {
                return true;
              }
              if (!isPaymentOnAccount && balanceDue > 0 && totalEntered > balanceDue + 0.01) {
                return true;
              }
              const cash = Number(cashAmount) || 0;
              const cheque = Number(chequeAmount) || 0;
              if (cash > 0 && !selectedAccount) {
                return true;
              }
              if (cheque > 0 && !chequeBank) {
                return true;
              }
              return false;
            })()}
            className="bg-blue-600 text-white px-10 py-2 rounded-lg text-sm font-semibold shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:text-slate-500 disabled:cursor-not-allowed"
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
