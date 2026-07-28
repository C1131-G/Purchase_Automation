/** Table list search applied when navigating from Overview open-doc KPI chips. */
export const OPEN_DOC_STATUS_FILTER = "Open" as const;

export type OpenDocTableLink = {
  to: string;
  search: {
    DocStatus: typeof OPEN_DOC_STATUS_FILTER;
    page: number;
    columnFilters: Array<{ id: "DocStatus"; value: typeof OPEN_DOC_STATUS_FILTER }>;
  };
};

/** Strip query string from API href and attach open DocStatus filter for the table. */
export function toOpenDocTableLink(href: string): OpenDocTableLink {
  const to = href.split("?")[0] ?? href;

  return {
    to,
    search: {
      DocStatus: OPEN_DOC_STATUS_FILTER,
      page: 1,
      columnFilters: [{ id: "DocStatus", value: OPEN_DOC_STATUS_FILTER }],
    },
  };
}
