import { describe, expect, it } from 'vitest';
import {
  buildAlertsResponse,
  evaluateApplication,
  getApplicationAlerts,
  getRequiredDocuments,
  summarizeAlerts,
} from '../src/compliance/alerts';
import type { Application } from '../src/domain/application.types';

const REFERENCE_DATE = '2026-10-27';

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'APP-TEST-001',
    collegeName: 'Test Institute of Technology',
    type: 'New Institution',
    status: 'Under Review',
    assignedOfficer: 'Officer One',
    dueDate: '2026-12-31',
    requiredDocuments: ['application_form', 'affiliation_certificate'],
    submittedDocuments: ['application_form', 'affiliation_certificate'],
    ...overrides,
  };
}

function alertsFor(overrides: Partial<Application>, referenceDate = REFERENCE_DATE) {
  return getApplicationAlerts(makeApplication(overrides), referenceDate);
}

describe('Rule A — missing documents', () => {
  it('returns no missing-document alert when all required documents are submitted', () => {
    const alerts = alertsFor({});
    expect(alerts.filter((alert) => alert.type === 'missing_documents')).toHaveLength(0);
  });

  it('detects one missing document and exposes its display name', () => {
    const alerts = alertsFor({
      requiredDocuments: ['application_form', 'affiliation_certificate', 'faculty_list'],
      submittedDocuments: ['application_form', 'affiliation_certificate'],
    });

    const missing = alerts.find((alert) => alert.type === 'missing_documents');
    expect(missing).toBeDefined();
    expect(missing?.missingDocumentCount).toBe(1);
    expect(missing?.missingDocuments).toEqual([{ id: 'faculty_list', name: 'Faculty List' }]);
    expect(missing?.message).toContain('Faculty List');
  });

  it('detects multiple missing documents in one deduplicated alert', () => {
    const alerts = alertsFor({
      requiredDocuments: [
        'application_form',
        'affiliation_certificate',
        'land_documents',
        'faculty_list',
      ],
      submittedDocuments: ['application_form'],
    });

    const missing = alerts.filter((alert) => alert.type === 'missing_documents');
    expect(missing).toHaveLength(1);
    expect(missing[0]?.missingDocumentCount).toBe(3);
    expect(missing[0]?.missingDocuments.map((document) => document.name)).toEqual([
      'Affiliation Certificate',
      'Land Ownership Documents',
      'Faculty List',
    ]);
  });

  it('recalculates when a document submission is added', () => {
    const before = alertsFor({
      requiredDocuments: ['application_form', 'faculty_list'],
      submittedDocuments: ['application_form'],
    });
    expect(before.some((alert) => alert.type === 'missing_documents')).toBe(true);

    const after = alertsFor({
      requiredDocuments: ['application_form', 'faculty_list'],
      submittedDocuments: ['application_form', 'faculty_list'],
    });
    expect(after.some((alert) => alert.type === 'missing_documents')).toBe(false);
  });

  it('does not treat an unlisted document as submitted', () => {
    const alerts = alertsFor({
      requiredDocuments: ['application_form', 'financial_statement'],
      submittedDocuments: ['application_form'],
    });
    expect(alerts[0]?.missingDocuments).toEqual([
      { id: 'financial_statement', name: 'Audited Financial Statement' },
    ]);
  });

  it('does not emit missing-document alerts when no documents are required', () => {
    const alerts = alertsFor({
      type: 'Unknown Type',
      requiredDocuments: [],
      submittedDocuments: [],
    });
    expect(alerts).toHaveLength(0);
  });

  it('uses different configured rules for different application types', () => {
    const newInstitution = makeApplication({
      type: 'New Institution',
      requiredDocuments: [],
      submittedDocuments: ['application_form'],
    });
    const renewal = makeApplication({
      id: 'APP-TEST-002',
      type: 'Renewal',
      requiredDocuments: [],
      submittedDocuments: ['application_form'],
    });

    const newInstitutionMissing = getApplicationAlerts(newInstitution, REFERENCE_DATE).find(
      (alert) => alert.type === 'missing_documents',
    );
    const renewalMissing = getApplicationAlerts(renewal, REFERENCE_DATE).find(
      (alert) => alert.type === 'missing_documents',
    );

    expect(newInstitutionMissing?.missingDocumentCount).toBe(4);
    expect(renewalMissing?.missingDocumentCount).toBe(3);
    expect(newInstitutionMissing?.missingDocuments.map((document) => document.id)).toContain(
      'land_documents',
    );
    expect(renewalMissing?.missingDocuments.map((document) => document.id)).toContain(
      'compliance_report',
    );
  });

  it('exposes the central type mapping through getRequiredDocuments', () => {
    const documents = getRequiredDocuments(
      makeApplication({ type: 'Increase in Intake', requiredDocuments: [] }),
    );
    expect(documents).toEqual([
      'application_form',
      'affiliation_certificate',
      'faculty_list',
      'infrastructure_plan',
    ]);
  });

  it('deduplicates repeated required and submitted document identifiers', () => {
    const alerts = alertsFor({
      requiredDocuments: [
        'application_form',
        'application_form',
        'faculty_list',
        'faculty_list',
      ],
      submittedDocuments: ['application_form', 'application_form'],
    });

    const missing = alerts.filter((alert) => alert.type === 'missing_documents');
    expect(missing).toHaveLength(1);
    expect(missing[0]?.missingDocuments).toEqual([{ id: 'faculty_list', name: 'Faculty List' }]);
  });

  it('never emits duplicate alert ids for the same condition', () => {
    const application = makeApplication({
      requiredDocuments: ['application_form', 'faculty_list'],
      submittedDocuments: [],
      dueDate: '2026-10-27',
    });
    const response = buildAlertsResponse([application, application], REFERENCE_DATE);

    const ids = response.alerts.map((alert) => alert.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['due_soon:APP-TEST-001', 'missing_documents:APP-TEST-001']);
  });
});

describe('Rule B — upcoming deadlines', () => {
  it('does not warn when the deadline is more than three calendar days away', () => {
    expect(alertsFor({ dueDate: '2026-10-31' })).toHaveLength(0);
  });

  it('warns exactly three calendar days before the deadline', () => {
    const alerts = alertsFor({ dueDate: '2026-10-30' });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: 'due_soon',
      daysRemaining: 3,
      daysOverdue: null,
      severity: 'warning',
      dueDate: '2026-10-30',
    });
    expect(alerts[0]?.message).toContain('3 calendar days');
  });

  it('warns the day before the deadline', () => {
    const alerts = alertsFor({ dueDate: '2026-10-28' });
    expect(alerts[0]).toMatchObject({
      type: 'due_soon',
      daysRemaining: 1,
      title: 'Deadline tomorrow',
    });
  });

  it('reports a deadline today as due today and critical', () => {
    const alerts = alertsFor({ dueDate: '2026-10-27' });
    expect(alerts[0]).toMatchObject({
      type: 'due_soon',
      daysRemaining: 0,
      severity: 'critical',
      title: 'Deadline today',
    });
  });

  it('accepts a configurable threshold', () => {
    expect(alertsFor({ dueDate: '2026-10-31' }, REFERENCE_DATE)).toHaveLength(0);

    const alerts = getApplicationAlerts(makeApplication({ dueDate: '2026-10-31' }), REFERENCE_DATE, {
      dueSoonDays: 5,
    });
    expect(alerts[0]).toMatchObject({ type: 'due_soon', daysRemaining: 4 });
  });

  it('does not warn for a missing due date', () => {
    const alerts = alertsFor({ dueDate: null });
    expect(alerts).toHaveLength(0);
  });

  it('skips an invalid due date without throwing and emits a diagnostic', () => {
    const evaluation = evaluateApplication(
      makeApplication({ dueDate: '2026-02-30' }),
      REFERENCE_DATE,
    );
    expect(evaluation.alerts).toHaveLength(0);
    expect(evaluation.diagnostics).toHaveLength(1);
    expect(evaluation.diagnostics[0]).toMatchObject({
      applicationId: 'APP-TEST-001',
      code: 'invalid_due_date',
      value: '2026-02-30',
    });
  });
});

describe('Rule C — overdue applications', () => {
  it('flags an active application whose deadline was yesterday', () => {
    const alerts = alertsFor({ dueDate: '2026-10-26' });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: 'overdue',
      severity: 'critical',
      daysRemaining: null,
      daysOverdue: 1,
      dueDate: '2026-10-26',
    });
    expect(alerts[0]?.message).toContain('1 calendar day overdue');
  });

  it('reports the exact number of calendar days overdue', () => {
    const alerts = alertsFor({ dueDate: '2026-10-17' });
    expect(alerts[0]).toMatchObject({ type: 'overdue', daysOverdue: 10 });
  });

  it('does not flag completed or approved applications as overdue', () => {
    for (const status of ['Completed', 'Approved', 'Rejected', 'Withdrawn']) {
      const alerts = alertsFor({ status, dueDate: '2026-10-01' });
      expect(alerts, status).toHaveLength(0);
    }
  });

  it('does not flag an application with no deadline as overdue', () => {
    expect(alertsFor({ dueDate: null })).toHaveLength(0);
  });
});

describe('combined behaviour and summary counts', () => {
  it('returns multiple alert categories for one application', () => {
    const alerts = alertsFor({
      dueDate: '2026-10-26',
      requiredDocuments: ['application_form', 'faculty_list'],
      submittedDocuments: ['application_form'],
    });
    expect(alerts.map((alert) => alert.type).sort()).toEqual(['missing_documents', 'overdue']);
  });

  it('derives summary counts from the same alert records', () => {
    const applications: Application[] = [
      makeApplication({
        id: 'APP-A',
        dueDate: '2026-10-27',
        requiredDocuments: ['application_form', 'faculty_list'],
        submittedDocuments: [],
      }),
      makeApplication({ id: 'APP-B', dueDate: '2026-10-20' }),
      makeApplication({ id: 'APP-C', dueDate: '2026-12-31' }),
      makeApplication({ id: 'APP-D', status: 'Completed', dueDate: '2026-10-01' }),
    ];

    const response = buildAlertsResponse(applications, REFERENCE_DATE);
    const recomputed = summarizeAlerts(response.alerts);

    expect(response.alerts).toHaveLength(3);
    expect(response.summary).toEqual(recomputed);
    expect(response.summary).toMatchObject({
      totalActiveAlerts: 3,
      missingDocumentAlerts: 1,
      upcomingDeadlineAlerts: 1,
      overdueAlerts: 1,
      missingDocumentTotal: 2,
      critical: 2,
      warning: 1,
    });
    expect(
      response.summary.missingDocumentAlerts +
        response.summary.upcomingDeadlineAlerts +
        response.summary.overdueAlerts,
    ).toBe(response.summary.totalActiveAlerts);
  });

  it('sorts overdue alerts first, then due-soon, then missing documents', () => {
    const applications: Application[] = [
      makeApplication({ id: 'APP-MISSING', requiredDocuments: ['faculty_list'], submittedDocuments: [] }),
      makeApplication({ id: 'APP-DUE', dueDate: '2026-10-29' }),
      makeApplication({ id: 'APP-OVERDUE', dueDate: '2026-10-22' }),
    ];

    const response = buildAlertsResponse(applications, REFERENCE_DATE);
    expect(response.alerts.map((alert) => alert.type)).toEqual([
      'overdue',
      'due_soon',
      'missing_documents',
    ]);
  });

  it('uses calendar-day arithmetic across month and DST boundaries', () => {
    expect(alertsFor({ dueDate: '2026-11-02' })).toHaveLength(0);
    expect(alertsFor({ dueDate: '2026-10-30' })[0]?.daysRemaining).toBe(3);

    const dstReference = getApplicationAlerts(
      makeApplication({ dueDate: '2026-03-10' }),
      '2026-03-07',
    );
    expect(dstReference[0]?.daysRemaining).toBe(3);
  });

  it('accepts a Date reference date using its local calendar fields', () => {
    const alerts = getApplicationAlerts(
      makeApplication({ dueDate: '2026-10-30' }),
      new Date(2026, 9, 27, 23, 45),
    );
    expect(alerts[0]?.daysRemaining).toBe(3);
  });

  it('reports invalid application records through diagnostics instead of crashing', () => {
    const response = buildAlertsResponse(
      [null as unknown as Application],
      REFERENCE_DATE,
    );
    expect(response.alerts).toHaveLength(0);
    expect(response.diagnostics[0]?.code).toBe('invalid_application');
  });
});

describe('malformed and unknown application data', () => {
  it('reports an unknown application type instead of silently treating it as compliant', () => {
    const evaluation = evaluateApplication(
      makeApplication({
        type: 'Brand New Type',
        requiredDocuments: [],
        submittedDocuments: [],
      }),
      REFERENCE_DATE,
    );

    expect(evaluation.alerts).toHaveLength(0);
    expect(evaluation.diagnostics).toEqual([
      expect.objectContaining({
        applicationId: 'APP-TEST-001',
        code: 'unknown_application_type',
        value: 'Brand New Type',
      }),
    ]);
  });

  it('does not report an unknown type when explicit requirements are supplied', () => {
    const evaluation = evaluateApplication(
      makeApplication({
        type: 'Brand New Type',
        requiredDocuments: ['faculty_list'],
        submittedDocuments: [],
      }),
      REFERENCE_DATE,
    );

    expect(evaluation.diagnostics).toHaveLength(0);
    expect(evaluation.alerts[0]).toMatchObject({
      type: 'missing_documents',
      missingDocumentCount: 1,
    });
  });

  it('uses the central policy for a known type without reporting a diagnostic', () => {
    const evaluation = evaluateApplication(
      makeApplication({
        type: 'Renewal',
        requiredDocuments: [],
        submittedDocuments: ['application_form'],
      }),
      REFERENCE_DATE,
    );

    expect(evaluation.diagnostics).toHaveLength(0);
    expect(evaluation.alerts[0]?.missingDocumentCount).toBe(3);
  });

  it('treats a blank explicit list as empty and falls back to the central policy', () => {
    const evaluation = evaluateApplication(
      makeApplication({
        type: 'Renewal',
        requiredDocuments: ['   ', ''],
        submittedDocuments: ['application_form'],
      }),
      REFERENCE_DATE,
    );

    expect(evaluation.diagnostics).toHaveLength(0);
    expect(evaluation.alerts[0]?.missingDocumentCount).toBe(3);
  });

  it('reports an unknown type when the explicit list only contains blanks', () => {
    const evaluation = evaluateApplication(
      makeApplication({
        type: 'Brand New Type',
        requiredDocuments: ['   '],
        submittedDocuments: [],
      }),
      REFERENCE_DATE,
    );

    expect(evaluation.alerts).toHaveLength(0);
    expect(evaluation.diagnostics[0]?.code).toBe('unknown_application_type');
  });

  it('does not report an unknown type for terminal applications', () => {
    const evaluation = evaluateApplication(
      makeApplication({
        type: 'Brand New Type',
        status: 'Approved',
        requiredDocuments: [],
      }),
      REFERENCE_DATE,
    );

    expect(evaluation.alerts).toHaveLength(0);
    expect(evaluation.diagnostics).toHaveLength(0);
  });

  it('treats array-shaped records as invalid applications', () => {
    const response = buildAlertsResponse([[] as unknown as Application], REFERENCE_DATE);
    expect(response.alerts).toHaveLength(0);
    expect(response.diagnostics[0]?.code).toBe('invalid_application');

    const evaluation = evaluateApplication([] as unknown as Application, REFERENCE_DATE);
    expect(evaluation.diagnostics[0]?.code).toBe('invalid_application');
  });

  it('handles non-array document fields safely', () => {
    const evaluation = evaluateApplication(
      makeApplication({
        type: 'New Institution',
        requiredDocuments: 'not-an-array' as unknown as string[],
        submittedDocuments: null as unknown as string[],
      }),
      REFERENCE_DATE,
    );

    expect(evaluation.diagnostics).toHaveLength(0);
    expect(evaluation.alerts[0]?.missingDocumentCount).toBe(5);
  });

  it('normalises surrounding whitespace in identifiers and display fields', () => {
    const alerts = getApplicationAlerts(
      makeApplication({
        id: '  APP-TRIMMED  ',
        collegeName: '  Trimmed College  ',
        type: '  Renewal  ',
        status: '  Under Review  ',
        assignedOfficer: '  Officer Two  ',
        requiredDocuments: [],
        submittedDocuments: [],
        dueDate: '2026-10-26',
      }),
      REFERENCE_DATE,
    );

    expect(alerts[0]).toMatchObject({
      applicationId: 'APP-TRIMMED',
      collegeName: 'Trimmed College',
      applicationType: 'Renewal',
      applicationStatus: 'Under Review',
      assignedOfficer: 'Officer Two',
    });
  });

  it('deduplicates submitted identifiers without inflating or hiding results', () => {
    const alerts = alertsFor({
      requiredDocuments: ['application_form', 'faculty_list'],
      submittedDocuments: [
        'application_form',
        'application_form',
        'faculty_list',
        'faculty_list',
      ],
    });

    expect(alerts).toHaveLength(0);
  });
});

describe('additional rule boundaries', () => {
  it('warns exactly two calendar days before the deadline', () => {
    const alerts = alertsFor({ dueDate: '2026-10-29' });
    expect(alerts[0]).toMatchObject({
      type: 'due_soon',
      daysRemaining: 2,
      severity: 'warning',
    });
  });

  it('does not emit both overdue and due-soon alerts for the same deadline', () => {
    const alerts = alertsFor({ dueDate: '2026-10-26' });
    expect(alerts.map((alert) => alert.type)).toEqual(['overdue']);
  });

  it('supports a threshold of zero', () => {
    const today = getApplicationAlerts(
      makeApplication({ dueDate: '2026-10-27' }),
      REFERENCE_DATE,
      { dueSoonDays: 0 },
    );
    const tomorrow = getApplicationAlerts(
      makeApplication({ dueDate: '2026-10-28' }),
      REFERENCE_DATE,
      { dueSoonDays: 0 },
    );

    expect(today[0]).toMatchObject({ type: 'due_soon', daysRemaining: 0 });
    expect(tomorrow).toHaveLength(0);
  });

  it('recalculates when a status becomes terminal', () => {
    const active = alertsFor({ dueDate: '2026-10-01' });
    expect(active[0]?.type).toBe('overdue');

    const terminal = alertsFor({ status: 'Approved', dueDate: '2026-10-01' });
    expect(terminal).toHaveLength(0);

    const mixedCaseTerminal = alertsFor({
      status: '  aPpRoVeD  ',
      dueDate: '2026-10-01',
    });
    expect(mixedCaseTerminal).toHaveLength(0);
  });

  it('does not treat an unknown active status as terminal', () => {
    const alerts = alertsFor({ status: 'Escalated', dueDate: '2026-10-20' });
    expect(alerts[0]).toMatchObject({ type: 'overdue', daysOverdue: 7 });
  });

  it('recalculates when a deadline changes', () => {
    expect(alertsFor({ dueDate: '2026-10-31' })).toHaveLength(0);
    expect(alertsFor({ dueDate: '2026-10-30' })[0]).toMatchObject({
      type: 'due_soon',
      daysRemaining: 3,
    });
  });

  it('does not let an invalid date inflate active alert counts', () => {
    const response = buildAlertsResponse(
      [
        makeApplication({ id: 'APP-VALID', dueDate: '2026-10-20' }),
        makeApplication({ id: 'APP-INVALID', dueDate: '2026-02-30' }),
      ],
      REFERENCE_DATE,
    );

    expect(response.alerts).toHaveLength(1);
    expect(response.summary.totalActiveAlerts).toBe(1);
    expect(response.summary.overdueAlerts).toBe(1);
    expect(response.diagnostics).toEqual([
      expect.objectContaining({
        applicationId: 'APP-INVALID',
        code: 'invalid_due_date',
      }),
    ]);
  });

  it('resolves blank explicit requirements through getRequiredDocuments', () => {
    expect(
      getRequiredDocuments(
        makeApplication({ type: 'Renewal', requiredDocuments: ['  ', ''] }),
      ),
    ).toEqual([
      'application_form',
      'affiliation_certificate',
      'compliance_report',
      'financial_statement',
    ]);
  });
});
