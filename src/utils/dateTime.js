const pad = (value) => String(value).padStart(2, "0");
const DEFAULT_LOCALE = "en-IN";
const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const getDatePartsInTimeZone = (date, timeZone = DEFAULT_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return null;
  return { year, month, day };
};

export const parseDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value.trim())
  ) {
    // Backend stores naive UTC timestamps (no timezone); treat them as UTC.
    const normalized = value.trim().replace(" ", "T");
    const [datePart, timePart = "00:00:00"] = normalized.split("T");
    const [hmsPart, fractionPart = ""] = timePart.split(".");
    const milliPart = fractionPart
      ? `.${fractionPart.slice(0, 3).padEnd(3, "0")}`
      : "";

    const parsedUtc = new Date(`${datePart}T${hmsPart}${milliPart}Z`);
    return Number.isNaN(parsedUtc.getTime()) ? null : parsedUtc;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getLocalDateInputValue = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = parseDateValue(value);
  if (!date) return "";

  const parts = getDatePartsInTimeZone(date);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const toLocalDateKey = (value) => getLocalDateInputValue(value);

export const formatLocalDate = (
  value,
  locale = DEFAULT_LOCALE,
  timeZone = DEFAULT_TIME_ZONE
) => {
  const date = parseDateValue(value);
  return date ? date.toLocaleDateString(locale, { timeZone }) : "-";
};

export const formatLocalDateTime = (
  value,
  locale = DEFAULT_LOCALE,
  timeZone = DEFAULT_TIME_ZONE
) => {
  const date = parseDateValue(value);
  return date ? date.toLocaleString(locale, { timeZone }) : "-";
};

export const compareDatesDesc = (a, b) => {
  const left = parseDateValue(a)?.getTime() || 0;
  const right = parseDateValue(b)?.getTime() || 0;
  return right - left;
};

export const isSameLocalDay = (a, b) => {
  const left = toLocalDateKey(a);
  const right = toLocalDateKey(b);
  return Boolean(left && right && left === right);
};

export const isWithinLocalDateRange = (value, fromDateKey, toDateKey) => {
  const dateKey = toLocalDateKey(value);
  if (!dateKey) return false;
  if (fromDateKey && dateKey < fromDateKey) return false;
  if (toDateKey && dateKey > toDateKey) return false;
  return true;
};
