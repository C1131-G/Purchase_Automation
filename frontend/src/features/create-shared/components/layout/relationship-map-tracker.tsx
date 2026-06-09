import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  ShoppingCart,
  FileSpreadsheet,
  Undo2,
  Banknote,
  Loader2,
  Truck,
} from "lucide-react";
import React from "react";

import { relationshipMapQueries } from "@/features/create-shared/api/relationship-map.queries";
import type { NodeResult } from "@/features/create-shared/api/relationship-map.queries";

interface RelationshipMapTrackerProps {
  docType:
    | "sales-quotation"
    | "sales-order"
    | "ar-invoice"
    | "ar-credit-memo"
    | "purchase-quotation"
    | "purchase-order"
    | "ap-invoice"
    | "ap-credit-memo"
    | "grpo"
    | "incoming-payment"
    | "outgoing-payment";
  docEntry: number;
}

const NodeIcon = ({
  icon: Icon,
  label,
  active,
  items,
  linkPrefix,
  compact = false,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  items?: NodeResult[] | undefined;
  linkPrefix: string;
  compact?: boolean;
}) => {
  const hasItems = items && items.length > 0;
  const isSingle = hasItems && items.length === 1;

  const content = (
    <div
      className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2"} group relative z-10 ${!active ? "opacity-40 grayscale" : ""}`}
    >
      <div
        className={`${compact ? "w-7 h-7" : "w-12 h-12"} rounded-full flex items-center justify-center transition-all ${
          active
            ? "bg-blue-100 text-blue-600 ring-4 ring-blue-50 shadow-sm group-hover:scale-105"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        <Icon className={compact ? "w-3.5 h-3.5" : "w-6 h-6"} />
      </div>
      <div className="flex flex-col items-center">
        <span
          className={`${compact ? "text-[10px]" : "text-xs"} font-medium whitespace-nowrap ${active ? "text-slate-700" : "text-slate-400"}`}
        >
          {label}
        </span>
        {isSingle && items && items.length > 0 && (
          <span
            className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold text-blue-600 mt-0.5`}
          >
            #{items[0]?.docNum}
          </span>
        )}
      </div>

      {/* Dropdown for links */}
      {active && items && items.length > 1 && (
        <div className="absolute top-full pt-2 hidden group-hover:flex flex-col z-50 min-w-[120px] items-center">
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto max-h-60 flex flex-col w-full">
            {items.map((item) => (
              <Link
                key={item.docEntry}
                to={`${linkPrefix}/${item.docNum}/edit` as any}
                className="px-4 py-2 text-xs hover:bg-slate-50 text-slate-700 font-medium whitespace-nowrap text-center block"
              >
                #{item.docNum}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isSingle && items) {
    return (
      <Link
        to={`${linkPrefix}/${items[0]?.docNum}/edit` as any}
        className="block hover:opacity-90 transition-opacity"
      >
        {content}
      </Link>
    );
  }

  return content;
};

const ConnectingLine = ({ active, compact }: { active: boolean; compact?: boolean }) => (
  <div
    className={`h-[2px] flex-1 min-w-[32px] mx-1 ${compact ? "mt-3.5" : "mt-6"} ${active ? "bg-blue-500" : "bg-slate-200"} transition-colors`}
  />
);

export function RelationshipMapTracker({
  docType,
  docEntry,
  compact = false,
}: RelationshipMapTrackerProps & { compact?: boolean }) {
  const { data, isLoading, isError } = useQuery(relationshipMapQueries.map(docType, docEntry));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 text-sm text-rose-500 text-center">Failed to load relationship map</div>
    );
  }

  const isAP = [
    "purchase-quotation",
    "purchase-order",
    "ap-invoice",
    "ap-credit-memo",
    "grpo",
    "outgoing-payment",
  ].includes(docType);

  const hasDoc1 = isAP ? !!data.purchaseQuotation?.length : !!data.salesQuotation?.length;
  const hasDoc2 = isAP ? !!data.purchaseOrder?.length : !!data.salesOrder?.length;
  const hasDocGRPO = isAP ? !!data.grpo?.length : false;
  const hasDoc3 = isAP ? !!data.apInvoice?.length : !!data.arInvoice?.length;
  const hasDoc4 = isAP ? !!data.apCreditMemo?.length : !!data.arCreditMemo?.length;
  const hasDoc5 = isAP ? !!data.outgoingPayment?.length : !!data.incomingPayment?.length;

  const nodes = isAP
    ? [
        {
          icon: FileText,
          label: "Purchase Quotation",
          active: hasDoc1,
          items: data.purchaseQuotation,
          linkPrefix: "/purchase/quotations",
        },
        {
          icon: ShoppingCart,
          label: "Purchase Order",
          active: hasDoc2,
          items: data.purchaseOrder,
          linkPrefix: "/purchase/orders",
        },
        {
          icon: Truck,
          label: "GRPO",
          active: hasDocGRPO,
          items: data.grpo,
          linkPrefix: "/purchase/grpo",
        },
        {
          icon: FileSpreadsheet,
          label: "A/P Invoice",
          active: hasDoc3,
          items: data.apInvoice,
          linkPrefix: "/purchase/ap-invoice",
        },
        {
          icon: Undo2,
          label: "A/P Credit Memo",
          active: hasDoc4,
          items: data.apCreditMemo,
          linkPrefix: "/purchase/ap-credit-memo",
        },
        {
          icon: Banknote,
          label: "Outgoing Payment",
          active: hasDoc5,
          items: data.outgoingPayment,
          linkPrefix: "/purchase/outgoing-payment",
        },
      ]
    : [
        {
          icon: FileText,
          label: "Sales Quotation",
          active: hasDoc1,
          items: data.salesQuotation,
          linkPrefix: "/sales/quotations",
        },
        {
          icon: ShoppingCart,
          label: "Sales Order",
          active: hasDoc2,
          items: data.salesOrder,
          linkPrefix: "/sales/orders",
        },
        {
          icon: FileSpreadsheet,
          label: "A/R Invoice",
          active: hasDoc3,
          items: data.arInvoice,
          linkPrefix: "/sales/ar-invoice",
        },
        {
          icon: Undo2,
          label: "A/R Credit Memo",
          active: hasDoc4,
          items: data.arCreditMemo,
          linkPrefix: "/sales/ar-credit-memo",
        },
        {
          icon: Banknote,
          label: "Incoming Payment",
          active: hasDoc5,
          items: data.incomingPayment,
          linkPrefix: "/sales/incoming-payment",
        },
      ];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-100 w-full ${compact ? "min-w-[400px] px-4 py-2.5" : "min-w-[600px] p-6"}`}
    >
      <h3
        className={`font-semibold text-slate-800 ${compact ? "text-[11px] mb-2" : "text-sm mb-6"}`}
      >
        Document Relationship Map
      </h3>

      <div className="flex items-start justify-between relative">
        {nodes.map((node, index) => {
          const hasAnyBefore = nodes.slice(0, index).some((n) => n.active);
          const hasAnyAfter = nodes.slice(index).some((n) => n.active);
          const lineActive = hasAnyBefore && hasAnyAfter;

          return (
            <React.Fragment key={node.label}>
              {index > 0 && <ConnectingLine active={lineActive} compact={compact} />}
              <NodeIcon
                icon={node.icon}
                label={node.label}
                active={node.active}
                items={node.items}
                linkPrefix={node.linkPrefix}
                compact={compact}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
