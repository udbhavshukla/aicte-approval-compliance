import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAlerts, fetchApplications } from './api/alertsApi';
import { AlertFilters } from './components/AlertFilters';
import { AlertsTable } from './components/AlertsTable';
import { ApplicationDialog } from './components/ApplicationDialog';
import { DiagnosticsBanner } from './components/DiagnosticsBanner';
import { EmptyState, ErrorState, LoadingState } from './components/States';
import { SummaryCards } from './components/SummaryCards';
import { RefreshIcon } from './components/icons';
import {
  DEFAULT_ALERT_FILTERS,
  filterAlerts,
  type AlertFiltersState,
} from './lib/alertFilters';
import { formatDateOnly, formatDateTime } from './lib/format';
import type { AlertsResponse, Application } from './types/compliance';

type ViewState =
  | { status: 'loading' }
  | {
      status: 'ready';
      data: AlertsResponse;
      applications: Application[];
      detailsUnavailable: boolean;
    }
  | { status: 'error'; message: string };

export function App() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [filters, setFilters] = useState<AlertFiltersState>(DEFAULT_ALERT_FILTERS);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    void Promise.allSettled([
      fetchAlerts(controller.signal),
      fetchApplications(controller.signal),
    ]).then(([alertsResult, applicationsResult]) => {
      if (controller.signal.aborted) return;

      if (alertsResult.status === 'rejected') {
        const reason: unknown = alertsResult.reason;
        setState({
          status: 'error',
          message:
            reason instanceof Error
              ? reason.message
              : 'An unexpected error occurred while loading alerts.',
        });
        return;
      }

      setState({
        status: 'ready',
        data: alertsResult.value,
        applications:
          applicationsResult.status === 'fulfilled'
            ? applicationsResult.value.applications
            : [],
        detailsUnavailable: applicationsResult.status === 'rejected',
      });
    });

    return () => controller.abort();
  }, [reloadToken]);

  const applicationsById = useMemo(() => {
    const map = new Map<string, Application>();
    if (state.status === 'ready') {
      for (const application of state.applications) {
        map.set(application.id, application);
      }
    }
    return map;
  }, [state]);

  const filteredAlerts = useMemo(() => {
    if (state.status !== 'ready') return [];
    return filterAlerts(state.data.alerts, filters);
  }, [state, filters]);

  const closeDialog = useCallback(() => setSelectedApplicationId(null), []);

  const selectedAlerts = useMemo(() => {
    if (state.status !== 'ready' || !selectedApplicationId) return [];
    return state.data.alerts.filter(
      (alert) => alert.applicationId === selectedApplicationId,
    );
  }, [state, selectedApplicationId]);

  const meta = state.status === 'ready' ? state.data.meta : null;
  const summary = state.status === 'ready' ? state.data.summary : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              A
            </span>
            <span className="brand__text">
              <span className="brand__name">AICTE Approval Workflow</span>
              <span className="brand__sub">Compliance module</span>
            </span>
          </div>
          <span className="environment-pill">Prototype · Member 4</span>
        </div>
      </header>

      <main className="page">
        <section className="page-header" aria-labelledby="page-title">
          <div className="page-header__copy">
            <p className="eyebrow">Deterministic compliance monitoring</p>
            <h1 id="page-title">Compliance &amp; Alerts</h1>
            <p className="page-lede">
              Missing documents, approaching deadlines and overdue active applications,
              calculated from the shared application records.
            </p>
          </div>

          <div className="page-header__aside">
            <div className="reference-card">
              <span className="reference-card__label">Reference date</span>
              <strong className="reference-card__value">
                {meta ? formatDateOnly(meta.referenceDate) : '—'}
              </strong>
              <span className="reference-card__hint">
                {meta
                  ? `${meta.dueSoonThresholdDays}-calendar-day warning window`
                  : 'Loading alert window'}
              </span>
            </div>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setReloadToken((token) => token + 1)}
              disabled={state.status === 'loading'}
            >
              <RefreshIcon />
              Refresh
            </button>
          </div>
        </section>

        {state.status !== 'error' && (
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="sr-only">
              Alert summary
            </h2>
            <SummaryCards
              summary={summary}
              dueSoonThresholdDays={meta?.dueSoonThresholdDays ?? null}
            />
          </section>
        )}

        <section className="panel" aria-labelledby="alerts-heading">
          <div className="panel__header">
            <div>
              <h2 id="alerts-heading">Active alerts</h2>
              <p>
                Server-calculated results. Filtering only changes the displayed rows, not the
                summary counts.
              </p>
            </div>
            <span className="data-chip">
              API source · in-memory
              {meta ? ` · refreshed ${formatDateTime(meta.generatedAt)}` : ''}
            </span>
          </div>

          {state.status === 'loading' && <LoadingState />}

          {state.status === 'error' && (
            <ErrorState
              message={state.message}
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          )}

          {state.status === 'ready' && (
            <>
              <AlertFilters
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(DEFAULT_ALERT_FILTERS)}
                resultCount={filteredAlerts.length}
                totalCount={state.data.alerts.length}
              />

              {filteredAlerts.length === 0 ? (
                <EmptyState
                  filtered={state.data.alerts.length > 0}
                  onReset={() => setFilters(DEFAULT_ALERT_FILTERS)}
                />
              ) : (
                <AlertsTable
                  alerts={filteredAlerts}
                  applicationsById={applicationsById}
                  onOpenApplication={setSelectedApplicationId}
                />
              )}
            </>
          )}
        </section>

        {state.status === 'ready' && (
          <DiagnosticsBanner diagnostics={state.data.diagnostics} />
        )}

        <footer className="page-footer">
          <p>
            Alerts are advisory and rule-based. This module does not approve, reject, suspend or
            withdraw applications, send notifications, or replace authorised officer review.
          </p>
          <p>Sample data is fictional and resets when the backend restarts.</p>
        </footer>
      </main>

      {selectedApplicationId && state.status === 'ready' && (
        <ApplicationDialog
          applicationId={selectedApplicationId}
          application={applicationsById.get(selectedApplicationId) ?? null}
          alerts={selectedAlerts}
          detailsUnavailable={state.detailsUnavailable || !applicationsById.has(selectedApplicationId)}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
