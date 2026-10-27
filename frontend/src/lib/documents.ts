/**
 * UI labels for fictional prototype document identifiers.
 * Mirrors backend/src/domain/application.constants.ts.
 */
const DOCUMENT_LABELS: Record<string, string> = {
  application_form: 'Application Form',
  affiliation_certificate: 'Affiliation Certificate',
  land_documents: 'Land Ownership Documents',
  faculty_list: 'Faculty List',
  financial_statement: 'Audited Financial Statement',
  infrastructure_plan: 'Infrastructure Plan',
  compliance_report: 'Compliance Report',
};

export function documentLabel(documentId: string): string {
  return (
    DOCUMENT_LABELS[documentId] ??
    documentId
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b[a-z]/g, (character) => character.toUpperCase())
  );
}
