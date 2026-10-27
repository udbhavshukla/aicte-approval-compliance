export type AlertType = 'missing_documents' | 'due_soon' | 'overdue';

/** Two-level priority keeps the prototype interface unambiguous. */
export type AlertSeverity = 'critical' | 'warning';

export interface MissingDocumentReference {
  id: string;
  name: string;
}

export interface ComplianceAlert {
  /** Stable id used for deduplication, e.g. "missing_documents:APP-2026-001". */
  id: string;
  applicationId: string;
  collegeName: string;
  applicationType: string;
  applicationStatus: string;
  assignedOfficer: string | null;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Empty for deadline alerts. */
  missingDocuments: MissingDocumentReference[];
  /** Number of distinct documents in `missingDocuments`. */
  missingDocumentCount: number;
  /** Present on due_soon and overdue alerts. */
  dueDate: string | null;
  /** 0..threshold for due_soon alerts; null otherwise. */
  daysRemaining: number | null;
  /** Positive whole days for overdue alerts; null otherwise. */
  daysOverdue: number | null;
}

export interface AlertSummary {
  totalActiveAlerts: number;
  missingDocumentAlerts: number;
  upcomingDeadlineAlerts: number;
  overdueAlerts: number;
  /** Sum of distinct missing documents across all missing-document alerts. */
  missingDocumentTotal: number;
  critical: number;
  warning: number;
}

export interface ComplianceDiagnostic {
  applicationId: string | null;
  code: 'invalid_due_date' | 'invalid_application' | 'unknown_application_type';
  message: string;
  value?: string | null;
}

export interface ComplianceOptions {
  /** Configurable prototype threshold. Defaults to 3 calendar days. */
  dueSoonDays?: number;
  /** Optional override for the central type-to-documents mapping. */
  requiredDocumentsByType?: Record<string, string[]>;
}

export interface ApplicationEvaluation {
  alerts: ComplianceAlert[];
  diagnostics: ComplianceDiagnostic[];
}

export interface AlertsResponse {
  alerts: ComplianceAlert[];
  summary: AlertSummary;
  diagnostics: ComplianceDiagnostic[];
  meta: {
    referenceDate: string;
    dueSoonThresholdDays: number;
    generatedAt: string;
    dataSource: 'in-memory';
  };
}

export interface ApplicationsResponse {
  applications: import('../domain/application.types').Application[];
  count: number;
  meta: {
    dataSource: 'in-memory';
    note: string;
  };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
