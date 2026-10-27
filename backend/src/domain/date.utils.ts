/**
 * Date-only utilities.
 *
 * Deadlines are calendar dates, not instants. All comparisons therefore use
 * an integer "epoch day" derived from UTC calendar fields. This avoids DST
 * offsets and avoids rounding millisecond differences.
 */

const MS_PER_DAY = 86_400_000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DateOnly {
  year: number;
  month: number;
  day: number;
  /** Days since 1970-01-01 in the proleptic Gregorian calendar. */
  epochDay: number;
  /** Canonical YYYY-MM-DD representation. */
  iso: string;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function buildDateOnly(year: number, month: number, day: number): DateOnly | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  // Start from a neutral instant, then set UTC fields. setUTCFullYear avoids
  // the Date.UTC two-digit-year behaviour for years 0000-0099.
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    epochDay: Math.floor(date.getTime() / MS_PER_DAY),
    iso: `${pad(year, 4)}-${pad(month)}-${pad(day)}`,
  };
}

/** Strictly parses a date-only string. Returns null for anything invalid. */
export function parseDateOnly(value: unknown): DateOnly | null {
  if (typeof value !== 'string') return null;
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return null;

  return buildDateOnly(Number(match[1]), Number(match[2]), Number(match[3]));
}

/**
 * Normalises the reference date to a calendar date.
 *
 * A `Date` is interpreted using its LOCAL calendar fields because that is the
 * date the operator sees. Strings must be strict YYYY-MM-DD values.
 */
export function parseReferenceDate(referenceDate: Date | string = new Date()): DateOnly {
  if (typeof referenceDate === 'string') {
    const parsed = parseDateOnly(referenceDate);
    if (!parsed) {
      throw new TypeError('referenceDate must be a valid YYYY-MM-DD date-only string');
    }
    return parsed;
  }

  if (referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())) {
    const parsed = buildDateOnly(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      referenceDate.getDate(),
    );
    if (parsed) return parsed;
  }

  throw new TypeError('referenceDate must be a valid Date or YYYY-MM-DD string');
}

export function formatEpochDay(epochDay: number): string {
  const date = new Date(epochDay * MS_PER_DAY);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

/** Adds calendar days to a valid date-only string. */
export function addDays(dateOnly: string, days: number): string {
  const parsed = parseDateOnly(dateOnly);
  if (!parsed) throw new TypeError(`Invalid date-only value: ${dateOnly}`);

  const result = formatEpochDay(parsed.epochDay + Math.trunc(days));
  if (!parseDateOnly(result)) {
    throw new RangeError(
      `Adding ${days} day(s) to ${dateOnly} leaves the supported YYYY-MM-DD range`,
    );
  }
  return result;
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function calendarDaysBetween(from: DateOnly, to: DateOnly): number {
  return to.epochDay - from.epochDay;
}

export function todayDateOnly(now: Date = new Date()): string {
  return parseReferenceDate(now).iso;
}
