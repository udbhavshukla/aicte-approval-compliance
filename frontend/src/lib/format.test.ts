import { describe, expect, it } from 'vitest';
import { formatDateOnly, formatTiming, pluralise } from './format';
import { documentLabel } from './documents';
import type { ComplianceAlert } from '../types/compliance';

function timingAlert(overrides: Partial<ComplianceAlert>): ComplianceAlert {
  return {
    id: 'alert',
    applicationId: 'APP-001',
    collegeName: 'Test Institute',
    applicationType: 'New Institution',
    applicationStatus: 'Under Review',
    assignedOfficer: null,
    type: 'due_soon',
    severity: 'warning',
    title: 'Deadline approaching',
    message: 'Message',
    missingDocuments: [],
    missingDocumentCount: 0,
    dueDate: '2026-10-30',
    daysRemaining: 3,
    daysOverdue: null,
    ...overrides,
  };
}

describe('format helpers', () => {
  it('formats ISO date-only values without timezone shifts', () => {
    expect(formatDateOnly('2026-10-27')).toBe('27 Oct 2026');
    expect(formatDateOnly('2026-01-01')).toBe('1 Jan 2026');
  });

  it('keeps missing or invalid dates safe', () => {
    expect(formatDateOnly(null)).toBe('—');
    expect(formatDateOnly(undefined)).toBe('—');
    expect(formatDateOnly('not-a-date')).toBe('not-a-date');
    expect(formatDateOnly('2026-02-30')).toBe('2026-02-30');
    expect(formatDateOnly('2025-02-29')).toBe('2025-02-29');
  });

  it('formats leap days correctly', () => {
    expect(formatDateOnly('2024-02-29')).toBe('29 Feb 2024');
  });

  it('formats known and fallback document labels', () => {
    expect(documentLabel('faculty_list')).toBe('Faculty List');
    expect(documentLabel('custom_document')).toBe('Custom Document');
    expect(documentLabel('already-readable')).toBe('Already Readable');
  });

  it('formats deadline timing labels', () => {
    expect(
      formatTiming(timingAlert({ type: 'overdue', daysRemaining: null, daysOverdue: 1 })),
    ).toBe('1 day overdue');
    expect(
      formatTiming(timingAlert({ type: 'overdue', daysRemaining: null, daysOverdue: 6 })),
    ).toBe('6 days overdue');
    expect(formatTiming(timingAlert({ daysRemaining: 0 }))).toBe('Due today');
    expect(formatTiming(timingAlert({ daysRemaining: 1 }))).toBe('1 day remaining');
    expect(formatTiming(timingAlert({ daysRemaining: 3 }))).toBe('3 days remaining');
    expect(formatTiming(timingAlert({ type: 'missing_documents', daysRemaining: null }))).toBe('—');
  });

  it('pluralises counts', () => {
    expect(pluralise(1, 'document')).toBe('1 document');
    expect(pluralise(2, 'document')).toBe('2 documents');
    expect(pluralise(0, 'calendar day')).toBe('0 calendar days');
  });
});
