const pad = (value) => String(value).padStart(2, "0");

export const parseDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getLocalDateInputValue = (value = new Date()) => {
  const date = parseDateValue(value);
  if (!date) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const toLocalDateKey = (value) => getLocalDateInputValue(value);

export const formatLocalDate = (value, locale = "en-IN") => {
  const date = parseDateValue(value);
  return date ? date.toLocaleDateString(locale) : "-";
};

export const formatLocalDateTime = (value, locale = "en-IN") => {
  const date = parseDateValue(value);
  return date ? date.toLocaleString(locale) : "-";
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
