import type {
  AlertSeverity,
  AlertType,
  ComplianceAlert,
} from '../types/compliance';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const CATEGORY_LABELS: Record<AlertType, string> = {
  missing_documents: 'Missing documents',
  due_soon: 'Upcoming deadline',
  overdue: 'Overdue',
};

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
};

/** Formats YYYY-MM-DD without timezone shifts. Invalid values are returned as-is. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return value;
  }

  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function categoryLabel(type: AlertType): string {
  return CATEGORY_LABELS[type];
}

export function severityLabel(severity: AlertSeverity): string {
  return SEVERITY_LABELS[severity];
}

export function formatTiming(alert: ComplianceAlert): string {
  if (alert.type === 'overdue') {
    const days = alert.daysOverdue ?? 0;
    return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
  }

  if (alert.type === 'due_soon') {
    const days = alert.daysRemaining ?? 0;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  }

  return '—';
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
