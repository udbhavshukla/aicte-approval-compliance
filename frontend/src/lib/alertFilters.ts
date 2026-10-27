import type {
  AlertSeverity,
  AlertType,
  ComplianceAlert,
} from '../types/compliance';

export type CategoryFilter = AlertType | 'all';
export type SeverityFilter = AlertSeverity | 'all';

export interface AlertFiltersState {
  category: CategoryFilter;
  severity: SeverityFilter;
  query: string;
}

export const DEFAULT_ALERT_FILTERS: AlertFiltersState = {
  category: 'all',
  severity: 'all',
  query: '',
};

export function hasActiveFilters(filters: AlertFiltersState): boolean {
  return (
    filters.category !== 'all' ||
    filters.severity !== 'all' ||
    filters.query.trim().length > 0
  );
}

/** Presentation-only filtering; compliance decisions stay on the backend. */
export function filterAlerts(
  alerts: ComplianceAlert[],
  filters: AlertFiltersState,
): ComplianceAlert[] {
  const query = filters.query.trim().toLowerCase();

  return alerts.filter((alert) => {
    if (filters.category !== 'all' && alert.type !== filters.category) return false;
    if (filters.severity !== 'all' && alert.severity !== filters.severity) return false;

    if (!query) return true;

    const searchable = [
      alert.applicationId,
      alert.collegeName,
      alert.message,
      alert.title,
      alert.applicationStatus,
      alert.applicationType,
      alert.assignedOfficer ?? '',
      ...alert.missingDocuments.map((document) => document.name),
      ...alert.missingDocuments.map((document) => document.id),
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(query);
  });
}
