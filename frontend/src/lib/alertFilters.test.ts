import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ALERT_FILTERS,
  filterAlerts,
  hasActiveFilters,
} from './alertFilters';
import type { ComplianceAlert } from '../types/compliance';

function makeAlert(overrides: Partial<ComplianceAlert> = {}): ComplianceAlert {
  return {
    id: 'missing_documents:APP-001',
    applicationId: 'APP-001',
    collegeName: 'Test Institute',
    applicationType: 'New Institution',
    applicationStatus: 'Under Review',
    assignedOfficer: 'Officer One',
    type: 'missing_documents',
    severity: 'warning',
    title: 'Missing required documents',
    message: '1 required document is missing: Faculty List.',
    missingDocuments: [{ id: 'faculty_list', name: 'Faculty List' }],
    missingDocumentCount: 1,
    dueDate: null,
    daysRemaining: null,
    daysOverdue: null,
    ...overrides,
  };
}

const alerts: ComplianceAlert[] = [
  makeAlert(),
  makeAlert({
    id: 'due_soon:APP-002',
    applicationId: 'APP-002',
    collegeName: 'Second College',
    applicationType: 'Renewal',
    applicationStatus: 'Pending',
    assignedOfficer: 'Officer Two',
    type: 'due_soon',
    severity: 'critical',
    title: 'Deadline today',
    message: 'The application is due today (2026-10-27).',
    missingDocuments: [],
    missingDocumentCount: 0,
    dueDate: '2026-10-27',
    daysRemaining: 0,
  }),
  makeAlert({
    id: 'overdue:APP-003',
    applicationId: 'APP-003',
    collegeName: 'Third Institute',
    applicationType: 'Extension of Approval',
    applicationStatus: 'Query Raised',
    assignedOfficer: null,
    type: 'overdue',
    severity: 'critical',
    title: 'Application overdue',
    message: '5 calendar days overdue.',
    missingDocuments: [],
    missingDocumentCount: 0,
    dueDate: '2026-10-22',
    daysOverdue: 5,
  }),
];

describe('filterAlerts', () => {
  it('returns all alerts for the default filters', () => {
    expect(filterAlerts(alerts, DEFAULT_ALERT_FILTERS)).toHaveLength(3);
  });

  it('filters by category', () => {
    const result = filterAlerts(alerts, {
      ...DEFAULT_ALERT_FILTERS,
      category: 'overdue',
    });
    expect(result.map((alert) => alert.applicationId)).toEqual(['APP-003']);
  });

  it('filters by severity', () => {
    const result = filterAlerts(alerts, {
      ...DEFAULT_ALERT_FILTERS,
      severity: 'critical',
    });
    expect(result.map((alert) => alert.applicationId)).toEqual(['APP-002', 'APP-003']);
  });

  it('searches application, college, status, type, officer and document text case-insensitively', () => {
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'faculty' }),
    ).toHaveLength(1);
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'THIRD' }),
    ).toHaveLength(1);
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'officer one' }),
    ).toHaveLength(1);
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'APP-002' }),
    ).toHaveLength(1);
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'query raised' }),
    ).toHaveLength(1);
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'extension of approval' }),
    ).toHaveLength(1);
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'faculty_list' }),
    ).toHaveLength(1);
  });

  it('treats a whitespace-only query as no query', () => {
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: '   ' }),
    ).toHaveLength(3);
  });

  it('returns an empty list when filters match nothing', () => {
    expect(
      filterAlerts(alerts, {
        ...DEFAULT_ALERT_FILTERS,
        category: 'overdue',
        severity: 'warning',
      }),
    ).toHaveLength(0);
    expect(
      filterAlerts(alerts, { ...DEFAULT_ALERT_FILTERS, query: 'no-such-alert' }),
    ).toHaveLength(0);
  });

  it('combines filters', () => {
    expect(
      filterAlerts(alerts, {
        category: 'due_soon',
        severity: 'critical',
        query: 'second',
      }),
    ).toHaveLength(1);
  });

  it('detects whether filters are active', () => {
    expect(hasActiveFilters(DEFAULT_ALERT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_ALERT_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_ALERT_FILTERS, category: 'overdue' })).toBe(true);
  });
});
