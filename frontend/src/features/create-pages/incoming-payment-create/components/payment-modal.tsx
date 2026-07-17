import { CheckCircle2, Delete, Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/features/dashboard/utils/formatters";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";

import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/calendar/calendar";
import { LookupPopup } from "@/components/lookup/lookup-popup";
import { FieldBlock } from "@/features/create-pages/create-shared/components/core/field-block";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

import { incomingPaymentQueries } from "@/features/table-pages/incoming-payment/api/incoming-payment.queries";

const TransferCalendar = Calendar as unknown as (
  props: React.ComponentProps<typeof Calendar> & { minDate?: Date; maxDate?: Date },
) => React.ReactElement;
import amexImg from "@/assets/payment-icons/Amex.jpg";
import qrpayImg from "@/assets/payment-icons/Card.jpg"; // Using Card.jpg as placeholder for QR Pay or generic
import debitImg from "@/assets/payment-icons/Debit.jpg";
import masterImg from "@/assets/payment-icons/Master.jpg";
import mpaisaImg from "@/assets/payment-icons/Mpaisa.jpg";
import mycashImg from "@/assets/payment-icons/MyCash.jpg";
// Import assets
import visaImg from "@/assets/payment-icons/Visa.jpg";

interface PaymentCreditCard {
  CreditCard: number;
  CreditSum: number;
  VoucherNum: string;
  CreditCardNumber?: string;
  CardValidUntil?: string;
}

interface PaymentCheck {
  BankCode: string;
  Branch: string;
  CheckNumber: number;
  CheckSum: number;
  AccountNo?: string;
  Endorse?: "tYES" | "tNO";
  OriginallyIssuedBy?: string;
}

interface CardPayment {
  id: string;
  bank: string;
  cardType: string;
  amount: number;
  reference: string;
  surchargeRate: number;
  surchargeAmount: number;
  creditCardId: number; // ID for SAP
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  balanceDue: number;
  onPaymentSubmit: (paymentDetails: {
    PaymentCreditCards: PaymentCreditCard[];
    PaymentChecks?: PaymentCheck[];
    SurchargeTotal?: number;
    CashSum?: number;
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
  const [activeTab, setActiveTab] = useState<"Cash" | "Card" | "Cheque" | "Bank Transfer">("Cash");

  const [cashAmount, setCashAmount] = useState<string>("0");
  const [cardAmount, setCardAmount] = useState<string>("0");
  const [chequeAmount, setChequeAmount] = useState<string>("0");
  const [addedCards, setAddedCards] = useState<CardPayment[]>([]);

  const [eftposBank, setEftposBank] = useState<"ANZ" | "BSP" | "WESTPAC" | "Others">("BSP");
  const [cardType, setCardType] = useState<
    "VISA" | "MASTERCARD" | "AMEX" | "DEBIT" | "QRPAY" | "MYCASH" | "MPAISA"
  >("VISA");
  const [cardRef, setCardRef] = useState("");

  const [isPayViaCheck, setIsPayViaCheck] = useState(true);
  const [chequeBank, setChequeBank] = useState("");
  const [chequeBranch, setChequeBranch] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeAccountNo, setChequeAccountNo] = useState("");
  const [chequeIssuedBy, setChequeIssuedBy] = useState("");
  const [chequeEndorse, setChequeEndorse] = useState(false);

  const [transferAmount, setTransferAmount] = useState<string>("0");
  const [transferDate, setTransferDate] = useState<string>(toISODate(new Date()) || "");
  const [transferReference, setTransferReference] = useState("");
  const [transferAccountInput, setTransferAccountInput] = useState("");
  const [transferAccountFocused, setTransferAccountFocused] = useState(false);
  const [isTransferAccountLookupOpen, setTransferAccountLookupOpen] = useState(false);
  const [selectedTransferAccount, setSelectedTransferAccount] = useState<string | null>(null);
  const [transferDatePickerOpen, setTransferDatePickerOpen] = useState(false);
  const transferDateContainerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    position: "fixed",
    zIndex: 999999,
  });

  const { data: accountData, isLoading: isLoadingAccounts } = useQuery({
    ...incomingPaymentQueries.accountSuggestions(transferAccountInput || undefined, 500),
  });

  const { data: bankData, isLoading: isLoadingBanks } = useQuery({
    ...incomingPaymentQueries.bankDetails(undefined, 100, "FJ"),
  });

  const accountSuggestions: CreateLookupOption[] = (accountData?.data ?? []).map((acc) => ({
    code: acc.GLAccount,
    name: acc.Account,
  }));

  const selectTransferAccount = (item: CreateLookupOption) => {
    setTransferAccountInput(item.code);
    setSelectedTransferAccount(item.code);
    setTransferAccountFocused(false);
    setTransferAccountLookupOpen(false);
  };

  const handleTransferAccountChange = (value: string) => {
    setTransferAccountInput(value);
    if (value.trim() === "") {
      setSelectedTransferAccount(null);
      return;
    }
    const matched = accountSuggestions.find((a) => a.code.toLowerCase() === value.toLowerCase());
    if (matched) {
      selectTransferAccount(matched);
      return;
    }
    setTransferAccountFocused(true);
  };

  const updatePopoverPosition = () => {
    if (!transferDateContainerRef.current) return;
    const rect = transferDateContainerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const calendarHeight = 310;
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
    if (!transferDatePickerOpen) return;
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

  useEffect(() => {
    if (chequeIssuedBy.trim() !== "") {
      setChequeEndorse(true);
    } else {
      setChequeEndorse(false);
    }
  }, [chequeIssuedBy]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setCashAmount("0");
        setCardAmount("0");
        setChequeAmount("0");
        setAddedCards([]);
        setActiveTab("Cash");
        setEftposBank("BSP");
        setCardType("VISA");
        setCardRef("");
        setTransferAmount("0");
        setTransferDate(toISODate(new Date()) || "");
        setTransferReference("");
        setTransferAccountInput("");
        setSelectedTransferAccount(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleBankChange = (bank: "ANZ" | "BSP" | "WESTPAC" | "Others") => {
    setEftposBank(bank);
    if (bank === "Others") {
      if (["VISA", "MASTERCARD", "AMEX", "DEBIT"].includes(cardType)) {
        setCardType("MPAISA");
      }
    } else {
      if (["QRPAY", "MYCASH", "MPAISA"].includes(cardType)) {
        setCardType("VISA");
      }
    }
  };

  if (!open) {
    return null;
  }

  const getActiveAmount = () => {
    if (activeTab === "Cash") {
      return cashAmount;
    }
    if (activeTab === "Card") {
      return cardAmount;
    }
    if (activeTab === "Bank Transfer") {
      return transferAmount;
    }
    return chequeAmount;
  };

  const setActiveAmount = (val: string) => {
    if (activeTab === "Cash") {
      setCashAmount(val);
    }
    if (activeTab === "Card") {
      setCardAmount(val);
    }
    if (activeTab === "Cheque") {
      setChequeAmount(val);
    }
    if (activeTab === "Bank Transfer") {
      setTransferAmount(val);
    }
  };

  const handlePayFull = () => {
    const totalCurrentPayments =
      (Number(cashAmount) || 0) +
      (Number(chequeAmount) || 0) +
      (Number(transferAmount) || 0) +
      addedCards.reduce((sum, c) => sum + c.amount, 0);
    const remaining = balanceDue - totalCurrentPayments;

    if (remaining <= 0) {
      return;
    }

    if (activeTab === "Cash") {
      setCashAmount((Number(cashAmount) + remaining).toFixed(2));
    } else if (activeTab === "Card") {
      setCardAmount(remaining.toFixed(2));
    } else if (activeTab === "Cheque") {
      setChequeAmount(remaining.toFixed(2));
    } else if (activeTab === "Bank Transfer") {
      setTransferAmount(remaining.toFixed(2));
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

  let surchargeRate = 0;
  if (cardType === "VISA" || cardType === "MASTERCARD") {
    surchargeRate = 3.82;
  } else if (cardType === "AMEX") {
    surchargeRate = 4.91;
  } else {
    surchargeRate = 0;
  }

  const currentCardAmount = Number(cardAmount) || 0;
  const currentSurchargeAmount = Number(((currentCardAmount * surchargeRate) / 100).toFixed(2));

  const handleAddCard = () => {
    const amount = Number(cardAmount) || 0;
    if (amount <= 0) {      return;
    }
    if (!cardRef.trim()) {      return;
    }

    const totalPaidSoFar =
      (Number(cashAmount) || 0) +
      (Number(chequeAmount) || 0) +
      (Number(transferAmount) || 0) +
      addedCards.reduce((sum, c) => sum + c.amount, 0);
    if (!isPaymentOnAccount && totalPaidSoFar + amount > balanceDue + 0.01) {      return;
    }

    const cardIdMap: Record<string, number> = {
      AMEX: 3,
      DEBIT: 4,
      MASTERCARD: 2,
      MPAISA: 7,
      MYCASH: 6,
      QRPAY: 5,
      VISA: 1,
    };

    const newCard: CardPayment = {
      amount,
      bank: eftposBank,
      cardType,
      creditCardId: cardIdMap[cardType] || 1,
      id: Math.random().toString(36).substr(2, 9),
      reference: cardRef,
      surchargeAmount: currentSurchargeAmount,
      surchargeRate,
    };

    setAddedCards([...addedCards, newCard]);
    setCardAmount("0");
    setCardRef("");  };

  const handleRemoveCard = (id: string) => {
    setAddedCards(addedCards.filter((c) => c.id !== id));
  };

  const handleSubmit = () => {
    let cash = Number(cashAmount) || 0;
    let cheque = Number(chequeAmount) || 0;
    let transfer = Number(transferAmount) || 0;
    let cards = [...addedCards];

    // Auto-capture current tab if not added
    if (activeTab === "Card") {
      const amount = Number(cardAmount) || 0;
      if (amount > 0 && cardRef.trim()) {
        const cardIdMap: Record<string, number> = {
          AMEX: 3,
          DEBIT: 4,
          MASTERCARD: 2,
          MPAISA: 7,
          MYCASH: 6,
          QRPAY: 5,
          VISA: 1,
        };
        cards.push({
          amount,
          bank: eftposBank,
          cardType,
          creditCardId: cardIdMap[cardType] || 1,
          id: "auto-added",
          reference: cardRef,
          surchargeAmount: Number(((amount * surchargeRate) / 100).toFixed(2)),
          surchargeRate,
        });
      }
    }

    const paymentChecks: PaymentCheck[] = [];

    if (cheque > 0) {
      paymentChecks.push({
        BankCode: chequeBank || "CASH",
        Branch: chequeBranch || "LABASA",
        AccountNo: chequeAccountNo || "",
        CheckNumber: Number(chequeNo) || 1,
        CheckSum: cheque,
        Endorse: (chequeEndorse || chequeIssuedBy.trim() !== "" ? "tYES" : "tNO") as "tYES" | "tNO",
        OriginallyIssuedBy: chequeIssuedBy,
      });
    }

    const surchargeTotal = Number(
      cards.reduce((sum, c) => sum + (c.surchargeAmount || 0), 0).toFixed(2),
    );
    const paymentDetails: {
      PaymentCreditCards: PaymentCreditCard[];
      PaymentChecks?: PaymentCheck[];
      SurchargeTotal?: number;
      CashSum?: number;
      TransferSum?: number;
      TransferDate?: string;
      TransferAccount?: string;
      TransferReference?: string;
    } = {
      PaymentCreditCards: cards.map((c) => ({
        CardValidUntil: "2099-12-31",
        CreditCard: c.creditCardId,
        CreditCardNumber: "123",
        CreditSum: Number((c.amount + c.surchargeAmount).toFixed(2)),
        VoucherNum: c.reference,
      })),
      SurchargeTotal: surchargeTotal,
      CashSum: cash,
    };

    if (transfer > 0) {
      paymentDetails.TransferSum = transfer;
      paymentDetails.TransferDate = transferDate;
      paymentDetails.TransferReference = transferReference;
      if (selectedTransferAccount) {
        paymentDetails.TransferAccount = selectedTransferAccount;
      }
    }

    if (paymentChecks.length > 0) {
      paymentDetails.PaymentChecks = paymentChecks;
    }

    onPaymentSubmit(paymentDetails);
    onClose();
  };

  const totalPaid =
    (Number(cashAmount) || 0) +
    (Number(chequeAmount) || 0) +
    (Number(transferAmount) || 0) +
    addedCards.reduce((sum, c) => sum + c.amount, 0) +
    (activeTab === "Card" ? Number(cardAmount) || 0 : 0);
  const remainingBalance = balanceDue - totalPaid;

  const getCardIcon = (type: string) => {
    switch (type) {
      case "VISA": {
        return visaImg;
      }
      case "MASTERCARD": {
        return masterImg;
      }
      case "AMEX": {
        return amexImg;
      }
      case "DEBIT": {
        return debitImg;
      }
      case "MPAISA": {
        return mpaisaImg;
      }
      case "MYCASH": {
        return mycashImg;
      }
      case "QRPAY": {
        return qrpayImg;
      }
      default: {
        return qrpayImg;
      }
    }
  };

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
                  <span className="font-bold text-blue-500">
                    {formatCurrency(balanceDue, currencyCode)}
                  </span>
                </div>
              )}
              <div className="flex gap-1.5">
                <span className="text-emerald-500 font-medium">Paid:</span>
                <span className="font-bold text-emerald-500">
                  {formatCurrency(totalPaid, currencyCode)}
                </span>
              </div>
              {(balanceDue > 0 || !isPaymentOnAccount) && (
                <div className="flex gap-1.5">
                  <span className="text-orange-500 font-medium">
                    {remainingBalance < 0 ? "On Account:" : "Bal.:"}
                  </span>
                  <span className="font-bold text-orange-500">
                    {formatCurrency(Math.abs(remainingBalance), currencyCode)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {["Cash", "Card", "Cheque", "Bank Transfer"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "Cash" | "Card" | "Cheque" | "Bank Transfer")}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-teal-500 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab === "Cheque" ? "Cheque/Voucher" : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 overflow-y-auto flex-1">
          {activeTab === "Bank Transfer" ? (
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
                    value={transferAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val)) {
                        setTransferAmount(val);
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

              <div className="flex-1 flex flex-col space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="transferDate"
                      className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wider"
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
                        className="relative flex h-10 w-full items-center justify-start rounded border border-slate-200 bg-white pl-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      >
                        <span>{toDisplayDate(transferDate)}</span>
                        <div className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400 transition hover:bg-slate-100">
                          <CalendarIcon className="h-3.5 w-3.5" />
                        </div>
                      </button>
                      {transferDatePickerOpen &&
                        createPortal(
                          <div
                            ref={popoverRef}
                            style={popoverStyle}
                            className="bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <TransferCalendar
                              mode="single"
                              selected={parseISODate(transferDate)}
                              maxDate={new Date()}
                              onSelect={(value) => {
                                if (!(value instanceof Date)) return;
                                setTransferDate(toISODate(value));
                                setTransferDatePickerOpen(false);
                              }}
                            />
                          </div>,
                          document.body,
                        )}
                    </div>
                  </div>

                  <div className="relative">
                    <FieldBlock
                      label="GL Account"
                      placeholder="Search account..."
                      value={transferAccountInput}
                      onChange={handleTransferAccountChange}
                      onFocus={() => setTransferAccountFocused(true)}
                      onBlur={() => {
                        setTimeout(() => setTransferAccountFocused(false), 120);
                      }}
                      onOpenPopup={() => {
                        setTransferAccountLookupOpen(true);
                      }}
                      loading={isLoadingAccounts}
                    />
                    {transferAccountFocused && (
                      <SuggestionList
                        items={accountSuggestions}
                        onSelect={selectTransferAccount}
                        floating
                        showCode
                        codeLabel="GLAccount"
                        nameLabel="Account"
                        emptyText="No accounts found"
                        maxHeight="max-h-[200px]"
                        query={transferAccountInput}
                        scrollable={false}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="transferReference"
                    className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wider"
                  >
                    Reference
                  </label>
                  <input
                    id="transferReference"
                    type="text"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    placeholder="Enter transfer reference"
                    className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          ) : activeTab !== "Cheque" ? (
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

              <div className="flex-1 flex flex-col">
                {activeTab === "Card" ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h3 className="text-slate-800 font-bold text-sm mb-2">EFTPOS</h3>
                      <div className="flex gap-3 mb-4">
                        {["ANZ", "BSP", "WESTPAC", "Others"].map((bank) => (
                          <label
                            key={bank}
                            className="flex items-center gap-1.5 cursor-pointer text-xs"
                          >
                            <input
                              type="radio"
                              checked={eftposBank === bank}
                              onChange={() =>
                                handleBankChange(bank as "ANZ" | "BSP" | "WESTPAC" | "Others")
                              }
                              className="w-3.5 h-3.5 text-teal-500"
                            />
                            <span
                              className={
                                eftposBank === bank ? "text-teal-600 font-bold" : "text-slate-500"
                              }
                            >
                              {bank}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(eftposBank === "Others"
                        ? ["MPAISA", "MYCASH", "QRPAY"]
                        : ["VISA", "MASTERCARD", "AMEX", "DEBIT"]
                      ).map((type) => (
                        <button
                          key={type}
                          onClick={() =>
                            setCardType(
                              type as
                                | "VISA"
                                | "MASTERCARD"
                                | "AMEX"
                                | "DEBIT"
                                | "QRPAY"
                                | "MYCASH"
                                | "MPAISA",
                            )
                          }
                          className={`relative group h-16 border rounded-lg transition-all overflow-hidden bg-white flex items-center justify-center ${cardType === type ? "border-teal-500 ring-2 ring-teal-500 shadow-md" : "border-slate-200 hover:border-slate-300 shadow-sm"}`}
                        >
                          <img
                            src={getCardIcon(type)}
                            alt={type}
                            className="w-full h-full object-contain p-1"
                          />
                          {cardType === type && (
                            <div className="absolute top-1 right-1 bg-teal-500 rounded-full p-0.5">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-8 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Surcharge%</span>{" "}
                        <span className="font-bold text-slate-700">{surchargeRate}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Surcharge</span>{" "}
                        <span className="font-bold text-slate-700">
                          {formatCurrency(currentSurchargeAmount, currencyCode)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="cardRef"
                        className="block text-slate-400 text-[10px] mb-1 uppercase tracking-wider font-bold"
                      >
                        Reference#
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="cardRef"
                          type="text"
                          value={cardRef}
                          onChange={(e) => setCardRef(e.target.value)}
                          placeholder="Enter Ref#"
                          className="flex-1 border border-slate-200 rounded px-3 py-1.5 text-sm focus:border-teal-500 outline-none shadow-sm"
                        />

                        <button
                          onClick={handleAddCard}
                          className="bg-emerald-500 text-white px-5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-600 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> ADD
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                        Added Payments
                      </h4>
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        {addedCards.length === 0 && (
                          <p className="text-xs text-slate-300 italic py-2">No cards added yet</p>
                        )}
                        {addedCards.map((card) => (
                          <div
                            key={card.id}
                            className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 text-[11px] animate-in slide-in-from-right duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={getCardIcon(card.cardType)}
                                alt={card.cardType}
                                className="w-8 h-5 object-contain"
                              />
                              <span className="text-slate-500 font-medium">#{card.reference}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-700">
                                {formatCurrency(card.amount, currencyCode)}
                              </span>
                              <button
                                onClick={() => handleRemoveCard(card.id)}
                                className="text-rose-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 animate-in fade-in">
                    <Wallet className="w-16 h-16 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Cash Payment Selected</p>
                    <p className="text-xs opacity-60 text-center">
                      Enter the amount on the keypad
                      <br />
                      to settle with cash
                    </p>
                  </div>
                )}
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
                  <span className="text-sm font-bold text-slate-700">Pay via Check/Voucher</span>
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
                    options: [
                      { label: "Select Bank", value: "" },
                      ...(bankData?.data?.map((b) => ({ label: b.BankName, value: b.BankCode })) ||
                        []),
                    ],
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
                    label: "Check No./Voucher No.",
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
                        disabled={field.label === "Bank" && isLoadingBanks}
                      >
                        {field.options?.map((opt) => {
                          const val = typeof opt === "string" ? opt : opt.value;
                          const lbl = typeof opt === "string" ? opt || "Select Bank" : opt.label;
                          return (
                            <option key={val} value={val}>
                              {lbl}
                            </option>
                          );
                        })}
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
                    <span className="text-sm text-slate-500 font-medium">Endorse Check</span>
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
              const totalEntered =
                (Number(cashAmount) || 0) +
                (Number(chequeAmount) || 0) +
                (Number(transferAmount) || 0) +
                addedCards.reduce((sum, c) => sum + c.amount, 0);
              // Must have entered something
              if (totalEntered <= 0) {
                return true;
              }
              // Cannot overpay (pay more than what is owed)
              if (!isPaymentOnAccount && balanceDue > 0 && totalEntered > balanceDue + 0.01) {
                return true;
              }
              // Validate Bank Transfer specifics
              if (
                Number(transferAmount) > 0 &&
                (!selectedTransferAccount || !transferReference.trim())
              ) {
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

      <LookupPopup
        open={isTransferAccountLookupOpen}
        search={transferAccountInput}
        results={accountSuggestions}
        loading={isLoadingAccounts}
        error={null}
        codeLabel="GLAccount"
        nameLabel="Account"
        title="Select GL Account"
        searchPlaceholder="Search account..."
        onSearchChange={(v) => setTransferAccountInput(v)}
        onClose={() => setTransferAccountLookupOpen(false)}
        onSelect={(item) => selectTransferAccount({ code: item.code, name: item.name })}
      />
    </div>
  );
}
