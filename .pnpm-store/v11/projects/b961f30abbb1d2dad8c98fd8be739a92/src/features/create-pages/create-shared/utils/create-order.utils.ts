export const parseISODate = (value: string | undefined) => {
  if (!value) {
    return new Date();
  }

  const normalized = value.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const toISODate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const toDisplayDate = (value: string | undefined) => {
  const date = parseISODate(value);
  return date.toLocaleDateString("en-GB");
};

const normalizeServiceLayerFieldMessage = (message: string) => {
  const compactMessage = message.replaceAll(/\s+/g, " ").trim();

  if (
    /timeout of\s+\d+(\.\d+)?ms exceeded/i.test(compactMessage) ||
    /etimedout/i.test(compactMessage) ||
    /econnaborted/i.test(compactMessage) ||
    /network error/i.test(compactMessage)
  ) {
    return "Request timed out. Please try again.";
  }

  if (
    /Enter due date/i.test(compactMessage) ||
    /\[(ORDR|OPOR)\.DocDueDate\]/i.test(compactMessage)
  ) {
    return "Delivery Date is required.";
  }

  return compactMessage.replaceAll(/\s*\[[^[\]]+\]\s*$/g, "").trim();
};

export const normalizeCreateOrderErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message.trim()) {
    return normalizeServiceLayerFieldMessage(error.message);
  }

  return fallbackMessage;
};
