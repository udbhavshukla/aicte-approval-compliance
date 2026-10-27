/**
 * Frontend mirror of the backend integration contract.
 * Keep in sync with backend/src/domain/application.types.ts and
 * backend/src/compliance/alerts.types.ts.
 */

export interface Application {
  id: string;
  collegeName: string;
  type: string;
  status: string;
  assignedOfficer?: string | null;
  dueDate: string | null;
  requiredDocuments: string[];
  submittedDocuments: string[];
}

export type AlertType = 'missing_documents' | 'due_soon' | 'overdue';
export type AlertSeverity = 'critical' | 'warning';

export interface MissingDocumentReference {
  id: string;
  name: string;
}

export interface ComplianceAlert {
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
  missingDocuments: MissingDocumentReference[];
  missingDocumentCount: number;
  dueDate: string | null;
  daysRemaining: number | null;
  daysOverdue: number | null;
}

export interface AlertSummary {
  totalActiveAlerts: number;
  missingDocumentAlerts: number;
  upcomingDeadlineAlerts: number;
  overdueAlerts: number;
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

export interface AlertsMeta {
  referenceDate: string;
  dueSoonThresholdDays: number;
  generatedAt: string;
  dataSource: 'in-memory';
}

export interface AlertsResponse {
  alerts: ComplianceAlert[];
  summary: AlertSummary;
  diagnostics: ComplianceDiagnostic[];
  meta: AlertsMeta;
}

export interface ApplicationsResponse {
  applications: Application[];
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
