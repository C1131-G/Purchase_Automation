import React, { useState, useRef } from "react";
import { RelationshipMapTracker } from "./relationship-map-tracker";
import { createPortal } from "react-dom";

export function RelationshipMapHover({
  children,
  docType,
  docEntry,
}: {
  children: React.ReactNode;
  docType:
    | "sales-quotation"
    | "sales-order"
    | "ar-invoice"
    | "ar-credit-memo"
    | "purchase-quotation"
    | "purchase-order"
    | "grpo"
    | "ap-invoice"
    | "ap-credit-memo"
    | "incoming-payment"
    | "outgoing-payment";
  docEntry: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  return (
    <>
      <span ref={anchorRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </span>
      {isOpen &&
        createPortal(
          <div
            className="absolute z-[9999] pt-2 drop-shadow-2xl"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <RelationshipMapTracker docType={docType} docEntry={docEntry} compact={true} />
          </div>,
          document.body,
        )}
    </>
  );
}
