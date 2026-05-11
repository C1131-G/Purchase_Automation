import { CheckCircle2, Delete } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { FieldBlock } from "@/features/create-pages/create-shared/components/core/field-block";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";

interface PaymentCheck {
  BankCode: string;
  Branch: string;
  CheckNumber: number;
  CheckSum: number;
  CheckAccount?: string;
  Endorse?: "tYES" | "tNO";
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

  const [cashAmount, setCashAmount] = useState<string>("0");
  const [accountInput, setAccountInput] = useState("");
  const [accountFocused, setAccountFocused] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [chequeAmount, setChequeAmount] = useState<string>("0");
  const [isPayViaCheck, setIsPayViaCheck] = useState(true);
  const [chequeBank, setChequeBank] = useState("");
  const [chequeBranch, setChequeBranch] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeAccountNo, setChequeAccountNo] = useState("");
  const [chequeIssuedBy, setChequeIssuedBy] = useState("");
  const [chequeEndorse, setChequeEndorse] = useState(false);

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
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setCashAmount("0");
        setAccountInput("");
        setAccountFocused(false);
        setSelectedAccount(null);
        setChequeAmount("0");
        setActiveTab("Cash");
      }, 0);
      return () => clearTimeout(timer);
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
    setActiveAmount("0");
  };

  const handleKeypadPress = (digit: string) => {
    const current = getActiveAmount();
    if (current === "0" && digit !== ".") {
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
    if (current.length <= 1) {
      setActiveAmount("0");
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
        Endorse: (chequeEndorse ? "tYES" : "tNO") as "tYES" | "tNO",
      });
    }

    if (cash > 0) {
      paymentChecks.push({
        BankCode: "CASH",
        Branch: "Vendor Portal",
        CheckNumber: 1,
        CheckSum: cash,
        CheckAccount: selectedAccount || "",
        Endorse: "tNO",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col max-h-[95vh]">
        <div className="p-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800">Payment</h2>
            <div className="flex gap-4 text-sm">
              {balanceDue > 0 && (
                <div className="flex gap-1.5">
                  <span className="text-blue-500 font-medium">Invoice Amt.:</span>
                  <span className="font-bold text-blue-500">FJD {balanceDue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex gap-1.5">
                <span className="text-emerald-500 font-medium">Paid:</span>
                <span className="font-bold text-emerald-500">FJD {totalPaid.toFixed(2)}</span>
              </div>
              {(balanceDue > 0 || !isPaymentOnAccount) && (
                <div className="flex gap-1.5">
                  <span className="text-orange-500 font-medium">
                    {remainingBalance < 0 ? "On Account:" : "Bal.:"}
                  </span>
                  <span className="font-bold text-orange-500">
                    FJD {Math.abs(remainingBalance).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {(["Cash", "Cheque"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-teal-500 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 overflow-y-auto flex-1">
          {activeTab === "Cash" ? (
            <div className="flex gap-6">
              <div className="w-[260px] flex-shrink-0">
                {balanceDue > 0 && remainingBalance > 0 && (
                  <button
                    onClick={handlePayFull}
                    className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold mb-3 shadow-sm hover:bg-indigo-600"
                  >
                    PAY FULL <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={getActiveAmount()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val)) {
                        setActiveAmount(val);
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded px-3 py-1.5 text-base text-slate-700 outline-none bg-white focus:border-teal-500 shadow-inner"
                  />
                  <button
                    onClick={handleReset}
                    className="bg-rose-500 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm hover:bg-rose-600"
                  >
                    Reset
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, ".", "back"].map((key) =>
                    key === "back" ? (
                      <button
                        key="back"
                        onClick={handleBackspace}
                        className="bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center py-3 rounded"
                      >
                        <Delete className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        key={key}
                        onClick={() => handleKeypadPress(key.toString())}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-lg font-bold py-3 rounded"
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
                      setTimeout(() => setAccountFocused(false), 120);
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
                  <div className="flex items-center gap-2 rounded bg-teal-50 border border-teal-200 px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-teal-700">{selectedAccount}</p>
                  </div>
                )}

                <div className="mt-2 text-center text-slate-400">
                  <div className="flex items-center gap-1 text-xs">
                    <span>Enter amount on the keypad</span>
                    <span>&bull;</span>
                    <span>Select account</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4 animate-in fade-in pt-2">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPayViaCheck}
                    onChange={(e) => setIsPayViaCheck(e.target.checked)}
                    className="w-4 h-4 text-teal-500 rounded border-slate-300"
                  />
                  <span className="text-sm font-bold text-slate-700">Pay via Cheque</span>
                </label>
                <input
                  type="number"
                  value={chequeAmount}
                  onChange={(e) => setChequeAmount(e.target.value)}
                  className="border border-slate-200 rounded px-3 py-1.5 text-sm focus:border-teal-500 outline-none w-40 bg-white"
                />
                {balanceDue > 0 && remainingBalance > 0 && (
                  <button
                    onClick={handlePayFull}
                    className="bg-indigo-500 text-white px-5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-indigo-600 transition-colors"
                  >
                    PAY FULL <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:border-teal-500 outline-none bg-white"
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
                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:border-teal-500 outline-none bg-white"
                      />
                    )}
                  </div>
                ))}
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chequeEndorse}
                      onChange={(e) => setChequeEndorse(e.target.checked)}
                      className="w-4 h-4 text-teal-500 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-500 font-medium">Endorse Cheque</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <button
            onClick={onClose}
            className="bg-slate-100 text-slate-600 px-6 py-2 rounded text-sm font-bold hover:bg-slate-200 transition-colors"
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
            className="bg-teal-500 text-white px-10 py-2 rounded text-sm font-bold shadow-lg shadow-teal-100 hover:bg-teal-600 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            SUBMIT PAYMENT
          </button>
        </div>
      </div>
    </div>
  );
}
