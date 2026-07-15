export const mapDocStatus = (status: unknown): "Open" | "Closed" | "Draft" | string => {
  const normalized = status === null || status === undefined ? "" : String(status);
  if (normalized === "O") {
    return "Open";
  }
  if (normalized === "C") {
    return "Closed";
  }
  if (normalized === "D") {
    return "Draft";
  }
  if (normalized === "Open" || normalized === "Closed" || normalized === "Draft") {
    return normalized;
  }
  return normalized || "Draft";
};
