import { APPLICATION_TYPE_RULES } from '../domain/application.constants';
import type { Application } from '../domain/application.types';
import { addDays, todayDateOnly } from '../domain/date.utils';

function requiredFor(type: string): string[] {
  return [...(APPLICATION_TYPE_RULES[type]?.requiredDocuments ?? [])];
}

/**
 * Fictional demo records.
 *
 * Due dates are generated relative to `referenceDate` so the due-soon and
 * overdue scenarios remain visible whenever the prototype is started. All
 * institutions, officers and document requirements are invented for the demo.
 */
export function createSampleApplications(
  referenceDate: Date | string = new Date(),
): Application[] {
  const base = typeof referenceDate === 'string' ? referenceDate : todayDateOnly(referenceDate);

  return [
    {
      id: 'APP-2026-001',
      collegeName: 'Vidya Institute of Technology',
      type: 'New Institution',
      status: 'Under Review',
      assignedOfficer: 'Dr. Meera Nair',
      dueDate: addDays(base, 0),
      requiredDocuments: requiredFor('New Institution'),
      submittedDocuments: ['application_form', 'affiliation_certificate', 'faculty_list'],
    },
    {
      id: 'APP-2026-002',
      collegeName: 'Saraswati College of Engineering',
      type: 'Increase in Intake',
      status: 'Pending',
      assignedOfficer: 'Shri Arun Deshmukh',
      dueDate: addDays(base, 2),
      requiredDocuments: requiredFor('Increase in Intake'),
      submittedDocuments: [
        'application_form',
        'affiliation_certificate',
        'faculty_list',
        'infrastructure_plan',
      ],
    },
    {
      id: 'APP-2026-003',
      collegeName: 'Deccan Institute of Management',
      type: 'Extension of Approval',
      status: 'Query Raised',
      assignedOfficer: 'Dr. Meera Nair',
      dueDate: addDays(base, -5),
      requiredDocuments: requiredFor('Extension of Approval'),
      submittedDocuments: ['application_form', 'affiliation_certificate', 'faculty_list'],
    },
    {
      id: 'APP-2026-004',
      collegeName: 'Ganga Technical University',
      type: 'Renewal',
      status: 'Under Review',
      assignedOfficer: 'Shri Arun Deshmukh',
      dueDate: addDays(base, 10),
      requiredDocuments: requiredFor('Renewal'),
      submittedDocuments: [
        'application_form',
        'affiliation_certificate',
        'compliance_report',
        'financial_statement',
      ],
    },
    {
      id: 'APP-2026-005',
      collegeName: 'Kaveri Institute of Science',
      type: 'New Institution',
      status: 'Approved',
      assignedOfficer: 'Dr. Meera Nair',
      dueDate: addDays(base, -20),
      requiredDocuments: requiredFor('New Institution'),
      submittedDocuments: ['application_form', 'affiliation_certificate'],
    },
    {
      id: 'APP-2026-006',
      collegeName: 'Nilgiri Polytechnic',
      type: 'Increase in Intake',
      status: 'Completed',
      assignedOfficer: 'Shri Arun Deshmukh',
      dueDate: addDays(base, -2),
      requiredDocuments: requiredFor('Increase in Intake'),
      submittedDocuments: [
        'application_form',
        'affiliation_certificate',
        'faculty_list',
        'infrastructure_plan',
      ],
    },
    {
      id: 'APP-2026-007',
      collegeName: 'Sahyadri College of Commerce',
      type: 'Renewal',
      status: 'Pending',
      assignedOfficer: null,
      dueDate: null,
      requiredDocuments: requiredFor('Renewal'),
      submittedDocuments: ['application_form', 'affiliation_certificate', 'financial_statement'],
    },
    {
      id: 'APP-2026-008',
      collegeName: 'Brahmaputra Institute of Technology',
      type: 'Extension of Approval',
      status: 'Under Review',
      assignedOfficer: 'Dr. Meera Nair',
      dueDate: addDays(base, 3),
      requiredDocuments: requiredFor('Extension of Approval'),
      submittedDocuments: ['application_form', 'affiliation_certificate'],
    },
    {
      // Deliberately malformed record to demonstrate safe diagnostics.
      id: 'APP-2026-009',
      collegeName: 'Coromandel Institute of Design',
      type: 'Increase in Intake',
      status: 'Query Raised',
      assignedOfficer: 'Shri Arun Deshmukh',
      dueDate: '2026-02-30',
      requiredDocuments: requiredFor('Increase in Intake'),
      submittedDocuments: [
        'application_form',
        'affiliation_certificate',
        'faculty_list',
        'infrastructure_plan',
      ],
    },
  ];
}
