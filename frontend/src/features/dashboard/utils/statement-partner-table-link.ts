import { OPEN_DOC_STATUS_FILTER } from "./open-doc-table-link";

export type StatementPartnerRole = "vendor" | "customer";

export type StatementPartnerTableLink = {
  to: string;
  search: Record<string, unknown>;
};

function openStatusSearch() {
  return {
    DocStatus: OPEN_DOC_STATUS_FILTER,
    page: 1,
    columnFilters: [{ id: "DocStatus", value: OPEN_DOC_STATUS_FILTER }],
  };
}

/** Navigate from Statement partner breakdown to open docs filtered by partner. */
export function toStatementPartnerTableLink(
  role: StatementPartnerRole,
  cardCode: string,
): StatementPartnerTableLink {
  const trimmedCardCode = cardCode.trim();
  const cardFilter = trimmedCardCode
    ? {
        CardCode: trimmedCardCode,
        columnFilters: [
          { id: "DocStatus", value: OPEN_DOC_STATUS_FILTER },
          { id: "CardCode", value: trimmedCardCode },
        ],
      }
    : {};

  if (role === "vendor") {
    return {
      to: "/purchase/ap-invoice",
      search: { ...openStatusSearch(), ...cardFilter },
    };
  }

  return {
    to: "/sales/quotations",
    search: { ...openStatusSearch(), ...cardFilter },
  };
}
