import type { ReactNode } from 'react';
import type { AlertSummary } from '../types/compliance';
import { pluralise } from '../lib/format';
import {
  BellIcon,
  ClockIcon,
  DocumentAlertIcon,
  OverdueIcon,
} from './icons';

interface SummaryCardsProps {
  summary: AlertSummary | null;
  dueSoonThresholdDays: number | null;
}

interface CardDefinition {
  key: string;
  label: string;
  value: number | null;
  hint: string;
  tone: 'amber' | 'blue' | 'red' | 'slate';
  icon: ReactNode;
}

export function SummaryCards({ summary, dueSoonThresholdDays }: SummaryCardsProps) {
  const cards: CardDefinition[] = [
    {
      key: 'missing',
      label: 'Missing documents',
      value: summary?.missingDocumentAlerts ?? null,
      hint: summary
        ? summary.missingDocumentAlerts === 0
          ? 'All required documents received'
          : `${pluralise(summary.missingDocumentTotal, 'document')} across ${pluralise(
              summary.missingDocumentAlerts,
              'application',
            )}`
        : 'Loading summary',
      tone: 'amber',
      icon: <DocumentAlertIcon />,
    },
    {
      key: 'upcoming',
      label: 'Upcoming deadlines',
      value: summary?.upcomingDeadlineAlerts ?? null,
      hint:
        dueSoonThresholdDays === null
          ? 'Loading summary'
          : `Due today or within ${pluralise(dueSoonThresholdDays, 'calendar day')}`,
      tone: 'blue',
      icon: <ClockIcon />,
    },
    {
      key: 'overdue',
      label: 'Overdue applications',
      value: summary?.overdueAlerts ?? null,
      hint: summary
        ? summary.overdueAlerts === 0
          ? 'No active application is past its deadline'
          : 'Past the due date and still active'
        : 'Loading summary',
      tone: 'red',
      icon: <OverdueIcon />,
    },
    {
      key: 'total',
      label: 'Total active alerts',
      value: summary?.totalActiveAlerts ?? null,
      hint: summary
        ? `${pluralise(summary.critical, 'critical alert')} · ${pluralise(
            summary.warning,
            'warning',
          )}`
        : 'Loading summary',
      tone: 'slate',
      icon: <BellIcon />,
    },
  ];

  return (
    <div className="summary-grid" aria-busy={summary === null}>
      {cards.map((card) => (
        <article className={`summary-card summary-card--${card.tone}`} key={card.key}>
          <div className="summary-card__top">
            <h3 className="summary-card__label">{card.label}</h3>
            <span className="summary-card__icon" aria-hidden="true">
              {card.icon}
            </span>
          </div>
          <div className="summary-card__value">
            {card.value === null ? (
              <span className="skeleton skeleton--value" aria-hidden="true" />
            ) : (
              card.value
            )}
          </div>
          <p className="summary-card__hint">
            {card.value === null ? <span className="skeleton skeleton--hint" /> : card.hint}
          </p>
        </article>
      ))}
    </div>
  );
}
