import { describe, expect, it } from 'vitest';
import {
  addDays,
  calendarDaysBetween,
  parseDateOnly,
  parseReferenceDate,
  todayDateOnly,
} from '../src/domain/date.utils';

describe('date-only utilities', () => {
  it('parses valid ISO date-only strings', () => {
    expect(parseDateOnly('2026-10-27')).toMatchObject({
      year: 2026,
      month: 10,
      day: 27,
      iso: '2026-10-27',
    });
  });

  it('accepts leap days only in leap years', () => {
    expect(parseDateOnly('2024-02-29')).not.toBeNull();
    expect(parseDateOnly('2025-02-29')).toBeNull();
  });

  it('rejects invalid, malformed and non-string values', () => {
    for (const value of ['2026-02-30', '2026-13-01', '27-10-2026', '2026-1-1', '', null, 20261027]) {
      expect(parseDateOnly(value), String(value)).toBeNull();
    }
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('compares calendar days without timezone rounding', () => {
    const first = parseDateOnly('2026-03-07');
    const second = parseDateOnly('2026-03-10');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (first && second) {
      expect(calendarDaysBetween(first, second)).toBe(3);
    }
  });

  it('normalises Date references using local calendar fields', () => {
    expect(parseReferenceDate(new Date(2026, 9, 27, 23, 59)).iso).toBe('2026-10-27');
    expect(todayDateOnly(new Date(2027, 0, 1, 0, 1))).toBe('2027-01-01');
  });

  it('throws on an invalid reference date', () => {
    expect(() => parseReferenceDate('2026-02-30')).toThrow(TypeError);
    expect(() => parseReferenceDate(new Date('invalid'))).toThrow(TypeError);
  });

  it('rejects timestamps, timezone suffixes and date-time strings', () => {
    for (const value of [
      '2026-10-27T00:00:00Z',
      '2026-10-27T00:00:00.000Z',
      '2026-10-27 00:00:00',
      '2026-10-27Z',
      '2026-10-27+05:30',
    ]) {
      expect(parseDateOnly(value), value).toBeNull();
    }
  });

  it('accepts surrounding whitespace after trimming', () => {
    expect(parseDateOnly('  2026-10-27  ')?.iso).toBe('2026-10-27');
    expect(parseReferenceDate(' 2026-10-27 ').iso).toBe('2026-10-27');
  });

  it('handles February 28 and 29 in leap and non-leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
    expect(addDays('2000-02-28', 1)).toBe('2000-02-29');
    expect(addDays('1900-02-28', 1)).toBe('1900-03-01');
  });

  it('handles month, year and leap-year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2024-02-29', -1)).toBe('2024-02-28');
  });

  it('supports four-digit years at both ends of the range', () => {
    expect(parseDateOnly('0000-01-01')?.iso).toBe('0000-01-01');
    expect(parseDateOnly('0099-12-31')?.iso).toBe('0099-12-31');
    expect(parseDateOnly('9999-12-31')?.iso).toBe('9999-12-31');
    expect(parseDateOnly('10000-01-01')).toBeNull();
  });

  it('throws instead of returning an unparseable date from addDays', () => {
    expect(() => addDays('9999-12-31', 1)).toThrow(RangeError);
    expect(() => addDays('0000-01-01', -1)).toThrow(RangeError);
    expect(() => addDays('2026-10-27', Number.NaN)).toThrow(RangeError);
  });

  it('returns negative differences when the target is earlier', () => {
    const first = parseDateOnly('2026-03-10');
    const second = parseDateOnly('2026-03-07');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (first && second) {
      expect(calendarDaysBetween(first, second)).toBe(-3);
    }
  });

  it('returns null for undefined and unsupported value types', () => {
    expect(parseDateOnly(undefined)).toBeNull();
    expect(parseDateOnly({})).toBeNull();
    expect(parseDateOnly(['2026-10-27'])).toBeNull();
    expect(parseDateOnly(true)).toBeNull();
  });
});
