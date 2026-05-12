import { CheckCircle2, Delete } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [chequeAccountNo, setChequeAccountNo] = useState("");
  const [chequeIssuedBy, setChequeIssuedBy] = useState("");
  const [isAccountLookupOpen, setAccountLookupOpen] = useState(false);

  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: accountData, isLoading: isLoadingAccounts } = useQuery({
    ...outgoingPaymentQueries.accountSuggestions(accountInput || undefined, 20),
  });

  const accountSuggestions: CreateLookupOption[] = (accountData?.data ?? []).map(
    (acc: { GLAccount: string }) => ({
      code: acc.GLAccount,
      name: acc.GLAccount,
    }),
  );

  const handleAccountChange = (value: string) => {
    setAccountInput(value);
    if (value.trim() === "") {
      setSelectedAccount(null);
      return;
    }
    const matched = accountSuggestions.find((a) => a.name.toLowerCase() === value.toLowerCase());
    if (matched) {
      selectAccount(matched);
      return;
    }
    setAccountFocused(true);
  };

  const selectAccount = (item: CreateLookupOption) => {
    setAccountInput(item.name);
    setSelectedAccount(item.name);
    setAccountFocused(false);
    setAccountLookupOpen(false);
  };

  const accountLookupItems: LookupItem[] = accountSuggestions.map((s) => ({
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
        setActiveTab("Cash");
      }, 0);
      return () => {
        clearTimeout(timer);
        clearTimeout(focusTimeoutRef.current);
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
      paymentChecks.push({
        BankCode: chequeBank || "CASH",
        Branch: chequeBranch || "LABASA",
        CheckAccount: chequeAccountNo || "",
        CheckNumber: Number(chequeNo) || 1,
        CheckSum: cheque,
      });
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
    } = {
      CashAccount: selectedAccount ?? null,
    };

    if (paymentChecks.length > 0) {
      paymentDetails.PaymentChecks = paymentChecks;
    }

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
            <h2 className="text-lg font-bold text-slate-800">Payment</h2>
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

        <div className="px-4 pb-4 flex-1 overflow-visible">
          {activeTab === "Cash" ? (
            <div className="flex gap-4">
              <div className="w-[260px] flex-shrink-0 border border-slate-100 rounded-xl p-3">
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
                      emptyText="No accounts found"
                      maxHeight="max-h-[200px]"
                      query={accountInput}
                      scrollable={false}
                    />
                  )}
                </div>

                {selectedAccount && (
                  <div className="flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-teal-700">{selectedAccount}</p>
                  </div>
                )}

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
            <div className="border border-slate-100 rounded-xl p-3">
              <div className="flex items-center gap-4 pb-3 mb-3 border-b border-slate-100">
                <input
                  type="number"
                  value={chequeAmount}
                  onChange={(e) => setChequeAmount(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none w-40 bg-white"
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

              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Bank",
                    options: ["", "ANZ", "BSP", "WESTPAC"],
                    setter: setChequeBank,
                    type: "select",
                    value: chequeBank,
                  },
                  {
                    label: "Branch",
                    setter: setChequeBranch,
                    type: "text",
                    value: chequeBranch,
                  },
                  {
                    label: "Check No.",
                    setter: setChequeNo,
                    type: "text",
                    value: chequeNo,
                  },
                  {
                    label: "Account No.",
                    setter: setChequeAccountNo,
                    type: "text",
                    value: chequeAccountNo,
                  },
                  {
                    label: "Issued by",
                    setter: setChequeIssuedBy,
                    type: "text",
                    value: chequeIssuedBy,
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-slate-400 text-[10px] mb-1 uppercase font-bold tracking-wider">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt || "Select Bank"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
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
              if (cash > 0 && !selectedAccount) {
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
        mode="vendor-name"
        title="Select Cash Account"
        searchPlaceholder="Search account name..."
        onSearchChange={(v) => setAccountInput(v)}
        onClose={() => setAccountLookupOpen(false)}
        onSelect={(item) => selectAccount({ code: item.code, name: item.name })}
      />
    </div>
  );
}
