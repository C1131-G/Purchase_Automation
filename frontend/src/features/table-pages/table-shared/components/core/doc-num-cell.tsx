import { RelationshipMapHover } from "@/features/create-shared/components/layout/relationship-map-hover";

interface DocNumCellProps {
  value: string | number;
  docEntry?: number;
  docType?:
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
  onHover?: ((docNum: string | number) => void) | undefined;
  onDoubleClick?: ((docNum: string | number) => void) | undefined;
}

export function DocNumCell({ value, docEntry, docType, onHover, onDoubleClick }: DocNumCellProps) {
  const content = (
    <span
      className="block cursor-pointer truncate transition-colors hover:text-blue-600"
      onMouseEnter={() => onHover?.(value)}
      onFocus={() => onHover?.(value)}
      onDoubleClick={() => onDoubleClick?.(value)}
      onClick={() => onDoubleClick?.(value)}
    >
      {value}
    </span>
  );

  if (docType && docEntry) {
    return (
      <RelationshipMapHover docType={docType as any} docEntry={docEntry}>
        {content}
      </RelationshipMapHover>
    );
  }

  return content;
}
