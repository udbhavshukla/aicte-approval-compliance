/**
 * Shared application contract for the SIH AICTE prototype.
 *
 * This is an integration contract, not a claim about any official AICTE API.
 * Other members should adapt their records to this shape (or provide an
 * adapter) so the compliance module has one source of truth.
 */
export interface Application {
  /** Stable public identifier, e.g. "APP-2026-001". */
  id: string;
  /** Institution / college name shown in alerts. */
  collegeName: string;
  /** Application type. Configurable in application.constants.ts. */
  type: string;
  /** Status label. Central definitions live in application.constants.ts. */
  status: string;
  /** Optional officer name or identifier owned by Member 3. */
  assignedOfficer?: string | null;
  /** ISO date-only string (YYYY-MM-DD), or null when no deadline applies. */
  dueDate: string | null;
  /**
   * Required document identifiers (stable snake_case keys).
   * If empty, the central rules for the application type are used.
   */
  requiredDocuments: string[];
  /**
   * Documents uploaded/submitted by the institution.
   * This prototype treats membership here as "submitted". Verification is a
   * separate workflow and is deliberately NOT inferred by this module.
   */
  submittedDocuments: string[];
}

export interface ApplicationTypeRule {
  label: string;
  requiredDocuments: string[];
}

export type ApplicationStatus =
  | 'Pending'
  | 'Under Review'
  | 'Query Raised'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn'
  | 'Completed';
