export const mapDocStatus = (status: string | null | undefined): "Open" | "Closed" | "Draft" => {
  if (status === "O") {
    return "Open";
  }
  if (status === "C") {
    return "Closed";
  }
  return "Draft";
};
