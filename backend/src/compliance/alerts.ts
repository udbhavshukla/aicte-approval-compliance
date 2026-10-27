import {
  APPLICATION_TYPE_RULES,
  COMPLETED_STATUSES,
  DEFAULT_DUE_SOON_DAYS,
  DOCUMENT_LABELS,
  MAX_DUE_SOON_DAYS,
} from '../domain/application.constants';
import type { Application } from '../domain/application.types';
import { parseDateOnly, parseReferenceDate, type DateOnly } from '../domain/date.utils';
import type {
  AlertSeverity,
  AlertSummary,
  AlertsResponse,
  ApplicationEvaluation,
  ComplianceAlert,
  ComplianceDiagnostic,
  ComplianceOptions,
  MissingDocumentReference,
} from './alerts.types';

const TYPE_PRIORITY: Record<ComplianceAlert['type'], number> = {
  overdue: 0,
  due_soon: 1,
  missing_documents: 2,
};

const completedStatusLookup = new Set(COMPLETED_STATUSES.map((status) => status.toLowerCase()));

function normaliseStatus(status: unknown): string {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

function normaliseDocumentId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isTerminalStatus(status: unknown): boolean {
  return completedStatusLookup.has(normaliseStatus(status));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  // Arrays are objects at runtime, but they are not valid application records.
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function documentName(documentId: string): string {
  const known = DOCUMENT_LABELS[documentId];
  if (known) return known;

  // Accept human-readable names as well as stable identifiers.
  return documentId
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/** Normalises a document list, dropping non-strings, blanks and duplicates. */
export function normaliseDocumentList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return unique(values.map(normaliseDocumentId));
}

function normaliseType(type: unknown): string {
  return typeof type === 'string' ? type.trim() : '';
}

/**
 * Resolves the required documents for an application.
 *
 * Explicit `application.requiredDocuments` wins (Member 2 may have already
 * applied type-specific rules). An empty/missing list — including a list that
 * only contains blank values — falls back to the central fictional mapping so
 * the module still behaves sensibly.
 */
export function getRequiredDocuments(
  application: Application,
  options: ComplianceOptions = {},
): string[] {
  const explicit = normaliseDocumentList(application.requiredDocuments);
  if (explicit.length > 0) return explicit;

  const type = normaliseType(application.type);
  if (!type) return [];

  const configured =
    options.requiredDocumentsByType?.[type] ??
    APPLICATION_TYPE_RULES[type]?.requiredDocuments ??
    [];

  return normaliseDocumentList(configured);
}

/**
 * Reports whether a document policy exists for the type, even when that policy
 * deliberately contains no required documents.
 */
function hasConfiguredDocumentPolicy(
  type: unknown,
  options: ComplianceOptions,
): boolean {
  const normalisedType = normaliseType(type);
  if (!normalisedType) return false;

  if (
    options.requiredDocumentsByType &&
    Object.prototype.hasOwnProperty.call(options.requiredDocumentsByType, normalisedType)
  ) {
    return true;
  }

  return Object.prototype.hasOwnProperty.call(APPLICATION_TYPE_RULES, normalisedType);
}

function normaliseDisplayText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/**
 * Read model used by `GET /api/applications`.
 *
 * Applies the same trimming and document resolution as the alert engine, so
 * returned identifiers match `ComplianceAlert.applicationId` and UI consumers
 * (for example the document checklist drawer) do not duplicate rule logic or
 * fail to find a matching record.
 */
export function resolveApplicationReadModel(application: Application): Application {
  return {
    ...application,
    id: normaliseDisplayText(application.id, 'UNKNOWN'),
    collegeName: normaliseDisplayText(application.collegeName, 'Unnamed institution'),
    type: normaliseDisplayText(application.type, 'Unknown'),
    status: normaliseDisplayText(application.status, 'Unknown'),
    assignedOfficer:
      typeof application.assignedOfficer === 'string' && application.assignedOfficer.trim()
        ? application.assignedOfficer.trim()
        : null,
    requiredDocuments: getRequiredDocuments(application),
    submittedDocuments: normaliseDocumentList(application.submittedDocuments),
  };
}

function resolveDueSoonDays(options: ComplianceOptions): number {
  const value = options.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;
  if (!Number.isInteger(value) || value < 0 || value > MAX_DUE_SOON_DAYS) {
    throw new RangeError(
      `dueSoonDays must be a whole number between 0 and ${MAX_DUE_SOON_DAYS}`,
    );
  }
  return value;
}

function formatDocumentList(documents: MissingDocumentReference[]): string {
  const names = documents.map((document) => document.name);
  if (names.length === 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function buildMissingDocumentsAlert(
  application: Application,
  documents: MissingDocumentReference[],
): ComplianceAlert {
  const noun = documents.length === 1 ? 'document is' : 'documents are';
  return {
    id: `missing_documents:${application.id}`,
    applicationId: application.id,
    collegeName: application.collegeName,
    applicationType: application.type,
    applicationStatus: application.status,
    assignedOfficer: application.assignedOfficer ?? null,
    type: 'missing_documents',
    severity: 'warning',
    title: 'Missing required documents',
    message: `${documents.length} required ${noun} missing: ${formatDocumentList(documents)}.`,
    missingDocuments: documents,
    missingDocumentCount: documents.length,
    dueDate: null,
    daysRemaining: null,
    daysOverdue: null,
  };
}

function buildDeadlineAlert(
  application: Application,
  type: 'due_soon' | 'overdue',
  dueDate: string,
  daysRemaining: number | null,
  daysOverdue: number | null,
): ComplianceAlert {
  const severity: AlertSeverity =
    type === 'overdue' || daysRemaining === 0 ? 'critical' : 'warning';

  let title: string;
  let message: string;

  if (type === 'overdue') {
    const dayWord = daysOverdue === 1 ? 'day' : 'days';
    title = 'Application overdue';
    message = `${daysOverdue} calendar ${dayWord} overdue. The due date was ${dueDate}.`;
  } else if (daysRemaining === 0) {
    title = 'Deadline today';
    message = `The application is due today (${dueDate}).`;
  } else if (daysRemaining === 1) {
    title = 'Deadline tomorrow';
    message = `The application is due tomorrow (${dueDate}), 1 calendar day remaining.`;
  } else {
    title = 'Deadline approaching';
    message = `The application is due on ${dueDate}, ${daysRemaining} calendar days remaining.`;
  }

  return {
    id: `${type}:${application.id}`,
    applicationId: application.id,
    collegeName: application.collegeName,
    applicationType: application.type,
    applicationStatus: application.status,
    assignedOfficer: application.assignedOfficer ?? null,
    type,
    severity,
    title,
    message,
    missingDocuments: [],
    missingDocumentCount: 0,
    dueDate,
    daysRemaining,
    daysOverdue,
  };
}

interface EvaluatedDeadline {
  alert: ComplianceAlert | null;
  diagnostic: ComplianceDiagnostic | null;
}

function evaluateDeadline(
  application: Application,
  reference: DateOnly,
  dueSoonDays: number,
): EvaluatedDeadline {
  const rawDueDate = application.dueDate;
  if (rawDueDate === null || rawDueDate === undefined || String(rawDueDate).trim() === '') {
    return { alert: null, diagnostic: null };
  }

  const parsed = parseDateOnly(rawDueDate);
  if (!parsed) {
    return {
      alert: null,
      diagnostic: {
        applicationId: application.id,
        code: 'invalid_due_date',
        message: 'The due date is not a valid YYYY-MM-DD date; deadline checks were skipped.',
        value: typeof rawDueDate === 'string' ? rawDueDate : String(rawDueDate),
      },
    };
  }

  const daysRemaining = parsed.epochDay - reference.epochDay;

  if (daysRemaining < 0) {
    return {
      alert: buildDeadlineAlert(
        application,
        'overdue',
        parsed.iso,
        null,
        Math.abs(daysRemaining),
      ),
      diagnostic: null,
    };
  }

  if (daysRemaining <= dueSoonDays) {
    return {
      alert: buildDeadlineAlert(application, 'due_soon', parsed.iso, daysRemaining, null),
      diagnostic: null,
    };
  }

  return { alert: null, diagnostic: null };
}

/**
 * Evaluates one application. Pure and deterministic: the same inputs always
 * produce the same alerts. Invalid application data is reported through
 * diagnostics instead of throwing.
 */
export function evaluateApplication(
  application: Application,
  referenceDate: Date | string = new Date(),
  options: ComplianceOptions = {},
): ApplicationEvaluation {
  const reference = parseReferenceDate(referenceDate);
  const dueSoonDays = resolveDueSoonDays(options);

  if (!isRecord(application)) {
    return {
      alerts: [],
      diagnostics: [
        {
          applicationId: null,
          code: 'invalid_application',
          message: 'Application record is not an object; compliance checks were skipped.',
        },
      ],
    };
  }

  const applicationId =
    typeof application.id === 'string' && application.id.trim()
      ? application.id.trim()
      : 'UNKNOWN';
  const safeApplication: Application = {
    ...application,
    id: applicationId,
    collegeName:
      typeof application.collegeName === 'string' && application.collegeName.trim()
        ? application.collegeName.trim()
        : 'Unnamed institution',
    type:
      typeof application.type === 'string' && application.type.trim()
        ? application.type.trim()
        : 'Unknown',
    status:
      typeof application.status === 'string' && application.status.trim()
        ? application.status.trim()
        : 'Unknown',
    assignedOfficer:
      typeof application.assignedOfficer === 'string' && application.assignedOfficer.trim()
        ? application.assignedOfficer.trim()
        : null,
    dueDate: application.dueDate ?? null,
    requiredDocuments: normaliseDocumentList(application.requiredDocuments),
    submittedDocuments: normaliseDocumentList(application.submittedDocuments),
  };

  const deadline = evaluateDeadline(safeApplication, reference, dueSoonDays);
  const diagnostics: ComplianceDiagnostic[] = [];
  if (deadline.diagnostic) diagnostics.push(deadline.diagnostic);

  // Terminal applications are closed. They receive no active alerts even if
  // documents are absent or the deadline has passed.
  if (isTerminalStatus(safeApplication.status)) {
    return { alerts: [], diagnostics };
  }

  const alerts: ComplianceAlert[] = [];

  const hasExplicitRequirements =
    normaliseDocumentList(safeApplication.requiredDocuments).length > 0;
  if (!hasExplicitRequirements && !hasConfiguredDocumentPolicy(safeApplication.type, options)) {
    diagnostics.push({
      applicationId: safeApplication.id,
      code: 'unknown_application_type',
      message: `No document requirements are configured for application type "${safeApplication.type}"; missing-document checks were skipped.`,
      value: safeApplication.type,
    });
  }

  const required = getRequiredDocuments(safeApplication, options);
  const submitted = new Set(
    safeApplication.submittedDocuments.map(normaliseDocumentId).filter(Boolean),
  );
  const missing = required
    .filter((documentId) => !submitted.has(documentId))
    .map<MissingDocumentReference>((documentId) => ({
      id: documentId,
      name: documentName(documentId),
    }));

  if (missing.length > 0) {
    alerts.push(buildMissingDocumentsAlert(safeApplication, missing));
  }

  if (deadline.alert) alerts.push(deadline.alert);

  return { alerts, diagnostics };
}

/**
 * Integration contract for other modules:
 * returns the active alerts for a single application.
 */
export function getApplicationAlerts(
  application: Application,
  referenceDate: Date | string = new Date(),
  options: ComplianceOptions = {},
): ComplianceAlert[] {
  return evaluateApplication(application, referenceDate, options).alerts;
}

export function summarizeAlerts(alerts: ComplianceAlert[]): AlertSummary {
  const summary: AlertSummary = {
    totalActiveAlerts: alerts.length,
    missingDocumentAlerts: 0,
    upcomingDeadlineAlerts: 0,
    overdueAlerts: 0,
    missingDocumentTotal: 0,
    critical: 0,
    warning: 0,
  };

  for (const alert of alerts) {
    if (alert.type === 'missing_documents') {
      summary.missingDocumentAlerts += 1;
      summary.missingDocumentTotal += alert.missingDocumentCount;
    } else if (alert.type === 'due_soon') {
      summary.upcomingDeadlineAlerts += 1;
    } else if (alert.type === 'overdue') {
      summary.overdueAlerts += 1;
    }

    if (alert.severity === 'critical') summary.critical += 1;
    if (alert.severity === 'warning') summary.warning += 1;
  }

  return summary;
}

function compareAlerts(first: ComplianceAlert, second: ComplianceAlert): number {
  const typeDifference = TYPE_PRIORITY[first.type] - TYPE_PRIORITY[second.type];
  if (typeDifference !== 0) return typeDifference;

  if (first.type === 'overdue' && second.type === 'overdue') {
    const difference = (second.daysOverdue ?? 0) - (first.daysOverdue ?? 0);
    if (difference !== 0) return difference;
  }

  if (first.type === 'due_soon' && second.type === 'due_soon') {
    const difference = (first.daysRemaining ?? 0) - (second.daysRemaining ?? 0);
    if (difference !== 0) return difference;
  }

  const applicationDifference = first.applicationId.localeCompare(second.applicationId);
  if (applicationDifference !== 0) return applicationDifference;

  return first.id.localeCompare(second.id);
}

/**
 * Builds the full API/UI payload from the shared application records.
 * Alerts, diagnostics and summary counts all derive from the same pass.
 */
export function buildAlertsResponse(
  applications: Application[],
  referenceDate: Date | string = new Date(),
  options: ComplianceOptions = {},
): AlertsResponse {
  if (!Array.isArray(applications)) {
    throw new TypeError('applications must be an array');
  }

  const reference = parseReferenceDate(referenceDate);
  const dueSoonDays = resolveDueSoonDays(options);
  const alerts: ComplianceAlert[] = [];
  const diagnostics: ComplianceDiagnostic[] = [];
  const seenAlertIds = new Set<string>();

  for (const application of applications) {
    const evaluation = evaluateApplication(application, reference.iso, {
      ...options,
      dueSoonDays,
    });

    diagnostics.push(...evaluation.diagnostics);

    for (const alert of evaluation.alerts) {
      // Stable deduplication: one active alert per application + condition.
      if (seenAlertIds.has(alert.id)) continue;
      seenAlertIds.add(alert.id);
      alerts.push(alert);
    }
  }

  alerts.sort(compareAlerts);

  return {
    alerts,
    summary: summarizeAlerts(alerts),
    diagnostics,
    meta: {
      referenceDate: reference.iso,
      dueSoonThresholdDays: dueSoonDays,
      generatedAt: new Date().toISOString(),
      dataSource: 'in-memory',
    },
  };
}
