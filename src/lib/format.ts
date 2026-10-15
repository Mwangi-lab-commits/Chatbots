/** Small date and number helpers. No external libraries. */

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Day key (YYYY-MM-DD) for chart grouping. */
export function dayKey(value: string): string {
  return value.slice(0, 10);
}

export function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}

/** Build a CSV file from rows. Quotes fields that contain commas or quotes. */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null): string => {
    const text = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const lines = [header.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\r\n");
}
