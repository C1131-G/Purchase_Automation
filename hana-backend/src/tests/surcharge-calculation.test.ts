import { describe, expect, it } from "vitest";

// Replicates the surcharge reversal logic used in createPayment
function calculateNetSum(cardId: number, grossSum: number): number {
  let surchargeRate = 0;
  if (cardId === 1 || cardId === 2) {
    surchargeRate = 3.82;
  } else if (cardId === 3) {
    surchargeRate = 4.91;
  }

  if (surchargeRate > 0) {
    const cardAmount = grossSum / (1 + surchargeRate / 100);
    return Number(cardAmount.toFixed(2));
  }
  return grossSum;
}

describe("Credit Card Surcharge Reversal Math", () => {
  it("should correctly reverse surcharge rate of 3.82% for Card ID 1 (VISA) to get exactly 10.00 from gross 10.38", () => {
    const net = calculateNetSum(1, 10.38);
    expect(net).toBe(10.0);
  });

  it("should correctly reverse surcharge rate of 3.82% for Card ID 2 (MASTERCARD) to get exactly 10.00 from gross 10.38", () => {
    const net = calculateNetSum(2, 10.38);
    expect(net).toBe(10.0);
  });

  it("should correctly reverse surcharge rate of 4.91% for Card ID 3 (AMEX) to get exactly 10.00 from gross 10.49", () => {
    const net = calculateNetSum(3, 10.49);
    expect(net).toBe(10.0);
  });

  it("should default to 0% surcharge for other card IDs (e.g. Card ID 5) and return original gross amount", () => {
    const net = calculateNetSum(5, 10.0);
    expect(net).toBe(10.0);
  });
});
