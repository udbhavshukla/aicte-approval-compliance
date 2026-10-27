import type { ApplicationStatus, ApplicationTypeRule } from './application.types';

/**
 * Central status configuration.
 *
 * `COMPLETED_STATUSES` is the single source of truth for "terminal" states.
 * Terminal applications never receive active compliance alerts. Add or rename
 * statuses here when integrating with the team's shared backend.
 */
export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'Pending',
  'Under Review',
  'Query Raised',
  'Approved',
  'Rejected',
  'Withdrawn',
  'Completed',
];

export const COMPLETED_STATUSES: readonly string[] = [
  'Approved',
  'Rejected',
  'Withdrawn',
  'Completed',
];

/**
 * FICTIONAL prototype document catalogue.
 *
 * These labels and requirements exist only to exercise the demo. They are not
 * official AICTE requirements and must be confirmed/replaced by the domain
 * owner before any real use.
 */
export const DOCUMENT_LABELS: Readonly<Record<string, string>> = {
  application_form: 'Application Form',
  affiliation_certificate: 'Affiliation Certificate',
  land_documents: 'Land Ownership Documents',
  faculty_list: 'Faculty List',
  financial_statement: 'Audited Financial Statement',
  infrastructure_plan: 'Infrastructure Plan',
  compliance_report: 'Compliance Report',
};

/**
 * FICTIONAL required-document rules by application type.
 * Kept in one place so Members 2 and 5 can replace the mapping without
 * touching the alert engine.
 */
export const APPLICATION_TYPE_RULES: Readonly<Record<string, ApplicationTypeRule>> = {
  'New Institution': {
    label: 'New Institution',
    requiredDocuments: [
      'application_form',
      'affiliation_certificate',
      'land_documents',
      'faculty_list',
      'financial_statement',
    ],
  },
  'Extension of Approval': {
    label: 'Extension of Approval',
    requiredDocuments: [
      'application_form',
      'affiliation_certificate',
      'faculty_list',
      'financial_statement',
    ],
  },
  'Increase in Intake': {
    label: 'Increase in Intake',
    requiredDocuments: [
      'application_form',
      'affiliation_certificate',
      'faculty_list',
      'infrastructure_plan',
    ],
  },
  Renewal: {
    label: 'Renewal',
    requiredDocuments: [
      'application_form',
      'affiliation_certificate',
      'compliance_report',
      'financial_statement',
    ],
  },
};

/** Prototype default, not an official AICTE deadline rule. */
export const DEFAULT_DUE_SOON_DAYS = 3;

/** Hard safety limit for the configurable threshold (one year). */
export const MAX_DUE_SOON_DAYS = 365;
