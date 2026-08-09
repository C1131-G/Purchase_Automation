import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  ShoppingCart,
  FileSpreadsheet,
  Undo2,
  Banknote,
  Truck,
  ClipboardList,
} from "lucide-react";
import React from "react";

import { relationshipMapQueries } from "@/features/create-shared/api/relationship-map.queries";
import type { NodeResult } from "@/features/create-shared/api/relationship-map.queries";

interface RelationshipMapTrackerProps {
  docType:
    | "request-for-quotation"
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
  buildLink,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  items?: NodeResult[] | undefined;
  linkPrefix: string;
  compact?: boolean;
  buildLink?: (item: NodeResult) => string;
}) => {
  const hasItems = items && items.length > 0;
  const isSingle = hasItems && items.length === 1;

  const resolveLink = (item: NodeResult) =>
    buildLink ? buildLink(item) : `${linkPrefix}/${item.docNum}/update`;

  const content = (
    <div
      className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2"} group relative z-10 ${!active ? "opacity-40 grayscale" : ""}`}
    >
      <div
        className={`${compact ? "w-7 h-7" : "w-12 h-12"} rounded-full flex items-center justify-center transition-all ${
          active
            ? "bg-teal-50 text-teal-600 ring-4 ring-teal-50 shadow-sm group-hover:scale-105"
            : "bg-linen-100 text-neutral-400"
        }`}
      >
        <Icon className={compact ? "w-3.5 h-3.5" : "w-6 h-6"} />
      </div>
      <div className="flex flex-col items-center">
        <span
          className={`${compact ? "text-[10px]" : "text-xs"} font-medium whitespace-nowrap ${active ? "text-ink-900" : "text-neutral-400"}`}
        >
          {label}
        </span>
        {isSingle && items && items.length > 0 && (
          <span
            className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold text-teal-600 mt-0.5`}
          >
            #{items[0]?.docNum}
          </span>
        )}
      </div>

      {/* Dropdown for links */}
      {active && items && items.length > 1 && (
        <div className="absolute top-full pt-2 hidden group-hover:flex flex-col z-50 min-w-[120px] items-center">
          <div className="bg-surface border border-linen-200 rounded-lg shadow-lg overflow-y-auto max-h-60 flex flex-col w-full">
            {items.map((item) => (
              <Link
                key={item.docEntry}
                to={resolveLink(item) as any}
                className="px-4 py-2 text-xs hover:bg-linen-50 text-ink-900 font-medium whitespace-nowrap text-center block"
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
        to={resolveLink(items[0]!) as any}
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
    className={`h-[3px] flex-1 min-w-[32px] mx-1 rounded-full transition-colors duration-500 ${
      active ? "bg-teal-500" : "bg-linen-200"
    } ${compact ? "mt-3.5" : "mt-6"}`}
  />
);

export function RelationshipMapTracker({
  docType,
  docEntry,
  compact = false,
}: RelationshipMapTrackerProps & { compact?: boolean }) {
  const { data, isLoading, isError } = useQuery(relationshipMapQueries.map(docType, docEntry));

  const isAP = [
    "purchase-quotation",
    "purchase-order",
    "ap-invoice",
    "ap-credit-memo",
    "grpo",
    "outgoing-payment",
  ].includes(docType);

  const isIcSalesDoc =
    !isAP && (docType === "request-for-quotation" || docType === "sales-quotation");

  if (isLoading) {
    const nodeCount = isAP ? 6 : isIcSalesDoc ? 2 : 5;
    return (
      <div
        className={`bg-surface rounded-xl shadow-sm border border-linen-100 w-full ${
          compact
            ? isIcSalesDoc
              ? "min-w-[280px] px-4 py-1.5"
              : "min-w-[400px] px-4 py-1.5"
            : isIcSalesDoc
              ? "min-w-[360px] p-6"
              : "min-w-[600px] p-6"
        }`}
      >
        <h3
          className={`font-semibold text-ink-900 ${compact ? "text-[11px] mb-1.5" : "text-sm mb-6"}`}
        >
          Document Relationship Map
        </h3>

        <div className="flex items-start justify-between relative">
          {Array.from({ length: nodeCount }).map((_, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ConnectingLine active={false} compact={compact} />}
              <div
                className={`flex flex-col items-center ${
                  compact ? "gap-0.5" : "gap-2"
                } group relative z-10`}
              >
                <div
                  className={`${
                    compact ? "w-7 h-7" : "w-12 h-12"
                  } rounded-full bg-linen-100 animate-pulse`}
                />
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <span
                      className={`${compact ? "text-[10px]" : "text-xs"} font-medium whitespace-nowrap opacity-0 select-none`}
                    >
                      Document Type
                    </span>
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 ${
                        compact ? "h-2 w-12" : "h-2.5 w-16"
                      } bg-linen-100 animate-pulse rounded`}
                    />
                  </div>
                  <div className="relative mt-0">
                    <span
                      className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold opacity-0 select-none`}
                    >
                      #00000
                    </span>
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 ${
                        compact ? "h-2 w-8" : "h-2.5 w-12"
                      } bg-linen-100 animate-pulse rounded`}
                    />
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 text-sm text-rose-500 text-center">Failed to load relationship map</div>
    );
  }

  const hasRfq = docType === "request-for-quotation" || !!data.requestForQuotation?.length;
  const hasSq = docType === "sales-quotation" || !!data.salesQuotation?.length;
  const isIcSalesMap = isIcSalesDoc;
  const hasDoc1 = isAP ? !!data.purchaseQuotation?.length : !!data.salesQuotation?.length;
  const hasDoc2 = isAP ? !!data.purchaseOrder?.length : !!data.salesOrder?.length;
  const hasDocGRPO = isAP ? !!data.grpo?.length : false;
  const hasDoc3 = isAP ? !!data.apInvoice?.length : !!data.arInvoice?.length;
  const hasDoc4 = isAP ? !!data.apCreditMemo?.length : !!data.arCreditMemo?.length;
  const hasDoc5 = isAP ? !!data.outgoingPayment?.length : !!data.incomingPayment?.length;

  const icSalesNodes = [
    {
      icon: ClipboardList,
      label: "Request For Quotation",
      active: hasRfq,
      items: data.requestForQuotation,
      linkPrefix: "/sales/request-for-quotations",
      buildLink: (item: NodeResult) => `/sales/request-for-quotations/${item.docEntry}`,
    },
    {
      icon: FileText,
      label: "Sales Quotation",
      active: hasSq,
      items: data.salesQuotation,
      linkPrefix: "/sales/quotations",
    },
  ];

  const standardSalesNodes = [
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
    : isIcSalesMap
      ? icSalesNodes
      : standardSalesNodes;

  const mapMinWidth = isIcSalesMap
    ? compact
      ? "min-w-[280px]"
      : "min-w-[360px]"
    : compact
      ? "min-w-[400px]"
      : "min-w-[600px]";

  return (
    <div
      className={`bg-surface rounded-xl shadow-sm border border-linen-100 w-full ${mapMinWidth} ${compact ? "px-4 py-2.5" : "p-6"}`}
    >
      <h3 className={`font-semibold text-ink-900 ${compact ? "text-[11px] mb-2" : "text-sm mb-6"}`}>
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
                {...("buildLink" in node ? { buildLink: node.buildLink } : {})}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
