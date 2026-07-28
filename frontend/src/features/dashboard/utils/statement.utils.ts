import type { OverviewAging, OverviewStatement, OverviewStatementPartner } from "./overview.types";

const MONEY_EPSILON = 0.01;

export function sumAgingTotal(aging: OverviewAging): number {
  return aging.d0_30 + aging.d31_60 + aging.d61_90 + aging.d90_plus;
}

export function sumOverdueAging(aging: OverviewAging): number {
  return aging.d31_60 + aging.d61_90 + aging.d90_plus;
}

/** True when OCRD balance and open-invoice aging total differ materially. */
export function hasBalanceAgingGap(balance: number, agingTotal: number): boolean {
  const gap = Math.abs(balance - agingTotal);
  if (gap <= MONEY_EPSILON) return false;
  const basis = Math.max(Math.abs(balance), Math.abs(agingTotal), 1);
  return gap / basis > 0.01;
}

export function balanceCaptionForRole(role: "vendor" | "customer" | "mixed"): {
  title: string;
  hint: string;
} {
  switch (role) {
    case "vendor":
      return {
        title: "You owe (vendor balance)",
        hint: "Posted AP balance on this vendor in OCRD",
      };
    case "customer":
      return {
        title: "They owe you (customer balance)",
        hint: "Posted AR balance on this customer in OCRD",
      };
    default:
      return {
        title: "Total partner balance",
        hint: "Sum of OCRD balances for all connected IC partners",
      };
  }
}

export function resolveStatementBalanceRole(
  selectionKind: "all" | "partner",
  partnerRole?: "vendor" | "customer",
): "vendor" | "customer" | "mixed" {
  if (selectionKind === "partner" && partnerRole) {
    return partnerRole;
  }
  return "mixed";
}

export function creditUtilizationPercent(
  balance: number,
  creditLine: number | null | undefined,
): number | null {
  if (creditLine == null || creditLine <= 0) return null;
  return Math.min(100, Math.round((Math.abs(balance) / creditLine) * 1000) / 10);
}

export function exportStatementCsv(
  statement: OverviewStatement,
  displayCurrency: string,
  asOf?: string,
): void {
  const lines: string[] = [
    "CardCode,CardName,Role,Currency,Balance,CreditLine,0-30,31-60,61-90,90+,Overdue,Blocked",
  ];

  for (const row of statement.partners) {
    const role = row.cardType === "S" ? "Vendor" : "Customer";
    const overdue = sumOverdueAging(row.aging);
    lines.push(
      [
        row.cardCode,
        `"${row.cardName.replaceAll('"', '""')}"`,
        role,
        row.currency ?? displayCurrency,
        row.balance.toFixed(2),
        row.creditLine != null ? row.creditLine.toFixed(2) : "",
        row.aging.d0_30.toFixed(2),
        row.aging.d31_60.toFixed(2),
        row.aging.d61_90.toFixed(2),
        row.aging.d90_plus.toFixed(2),
        overdue.toFixed(2),
        row.isFrozen ? "Y" : "N",
      ].join(","),
    );
  }

  const totalsOverdue = sumOverdueAging(statement.totals.aging);
  lines.push(
    [
      "TOTAL",
      "",
      "",
      displayCurrency,
      statement.totals.balance.toFixed(2),
      "",
      statement.totals.aging.d0_30.toFixed(2),
      statement.totals.aging.d31_60.toFixed(2),
      statement.totals.aging.d61_90.toFixed(2),
      statement.totals.aging.d90_plus.toFixed(2),
      totalsOverdue.toFixed(2),
      "",
    ].join(","),
  );

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const stamp = (asOf ?? new Date().toISOString()).slice(0, 10);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ic-statement-${stamp}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function partnerRoleFromCardType(
  cardType: OverviewStatementPartner["cardType"],
): "vendor" | "customer" {
  return cardType === "S" ? "vendor" : "customer";
}
