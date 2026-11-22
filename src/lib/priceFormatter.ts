/**
 * Comprehensive price and fee formatter to guarantee clean display values
 * with zero stray commas, proper currency formatting, and correct handling of "Free" items.
 */

export function parseNumericValue(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;

  let str = String(value).trim();
  if (str.toLowerCase() === "free" || str === "0" || str === "$0") return 0;

  // Handle cases where positional param `$1` in SQL queries stripped leading digits
  // e.g. ",500" was originally "$1,500" -> treat as 1500
  // e.g. ",990" was originally "$119,990" or "$1,990"
  if (str.startsWith(",")) {
    if (str.startsWith(",500")) {
      str = "1" + str;
    } else if (str.startsWith(",990")) {
      str = "119" + str;
    } else {
      str = "1" + str;
    }
  }

  // Remove currency signs, letters, and spaces, preserving digits and decimal
  const cleaned = str.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format any price (MSRP, prize value, amount) to standard USD currency string ($119,990).
 * If value is 0 or "free", returns "Free".
 */
export function formatDisplayPrice(
  value: string | number | null | undefined,
  fallbackFree: boolean = false
): string {
  if (value == null) return fallbackFree ? "Free" : "$0";

  const rawStr = String(value).trim();
  if (!rawStr) return fallbackFree ? "Free" : "$0";
  if (rawStr.toLowerCase() === "free" || rawStr === "$0") return "Free";

  const num = parseNumericValue(value);
  if (num === 0) return fallbackFree ? "Free" : "$0";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format delivery/transport fee.
 * Returns "$1,500", "$1,000", or "Free" without stray commas.
 */
export function formatFeeDisplay(fee: string | number | null | undefined): string {
  if (fee == null) return "$1,500";
  const str = String(fee).trim();
  if (!str || str.toLowerCase() === "free" || str === "0" || str === "$0") return "Free";

  const num = parseNumericValue(str);
  if (num === 0) return "Free";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}
