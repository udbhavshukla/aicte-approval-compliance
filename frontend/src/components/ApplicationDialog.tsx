import { useCallback, useEffect, useRef } from 'react';
import type { Application, ComplianceAlert } from '../types/compliance';
import { categoryLabel, formatDateOnly, formatTiming, severityLabel } from '../lib/format';
import { documentLabel } from '../lib/documents';
import { CheckIcon, CloseIcon, DocumentAlertIcon } from './icons';

interface ApplicationDialogProps {
  applicationId: string;
  application: Application | null;
  alerts: ComplianceAlert[];
  detailsUnavailable: boolean;
  onClose: () => void;
}

export function ApplicationDialog({
  applicationId,
  application,
  alerts,
  detailsUnavailable,
  onClose,
}: ApplicationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [handleKeyDown]);

  const submitted = new Set(
    (application?.submittedDocuments ?? [])
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const required = [
    ...new Set(
      (application?.requiredDocuments ?? [])
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const missingCount = required.filter((documentId) => !submitted.has(documentId)).length;

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-dialog-title"
        ref={dialogRef}
      >
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">Application record</p>
            <h2 id="application-dialog-title">
              {application?.collegeName ?? alerts[0]?.collegeName ?? 'Application details'}
            </h2>
            <p className="drawer__id">{applicationId}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close application details"
            ref={closeButtonRef}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="drawer__body">
          {detailsUnavailable && (
            <div className="inline-notice" role="status">
              Full application details are temporarily unavailable. Alert information is shown
              below.
            </div>
          )}

          {application && (
            <section className="drawer-section" aria-labelledby="overview-heading">
              <h3 id="overview-heading">Overview</h3>
              <dl className="detail-grid">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="status-pill">{application.status}</span>
                  </dd>
                </div>
                <div>
                  <dt>Application type</dt>
                  <dd>{application.type}</dd>
                </div>
                <div>
                  <dt>Assigned officer</dt>
                  <dd>{application.assignedOfficer || 'Not assigned'}</dd>
                </div>
                <div>
                  <dt>Due date</dt>
                  <dd>{formatDateOnly(application.dueDate)}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="drawer-section" aria-labelledby="dialog-alerts-heading">
            <div className="drawer-section__heading">
              <h3 id="dialog-alerts-heading">Active alerts</h3>
              <span className="count-chip">{alerts.length}</span>
            </div>
            {alerts.length === 0 ? (
              <p className="muted">No active alerts for this application.</p>
            ) : (
              <ul className="drawer-alerts">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <div className="drawer-alert__top">
                      <span className={`badge badge--${alert.type}`}>
                        {categoryLabel(alert.type)}
                      </span>
                      <span className={`severity severity--${alert.severity}`}>
                        <span className="severity__dot" aria-hidden="true" />
                        {severityLabel(alert.severity)}
                      </span>
                    </div>
                    <p>{alert.message}</p>
                    {alert.type !== 'missing_documents' && (
                      <p className="drawer-alert__timing">
                        {formatDateOnly(alert.dueDate)} · {formatTiming(alert)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="drawer-section" aria-labelledby="dialog-documents-heading">
            <div className="drawer-section__heading">
              <h3 id="dialog-documents-heading">Required documents</h3>
              {application && (
                <span className={`count-chip ${missingCount > 0 ? 'count-chip--warn' : ''}`}>
                  {missingCount === 0
                    ? 'All received'
                    : `${missingCount} missing`}
                </span>
              )}
            </div>
            {!application || required.length === 0 ? (
              <p className="muted">No required-document configuration is available.</p>
            ) : (
              <ul className="document-list">
                {required.map((documentId) => {
                  const isSubmitted = submitted.has(documentId);
                  return (
                    <li
                      className={`document-list__item ${
                        isSubmitted ? 'is-submitted' : 'is-missing'
                      }`}
                      key={documentId}
                    >
                      <span className="document-list__icon" aria-hidden="true">
                        {isSubmitted ? <CheckIcon /> : <DocumentAlertIcon />}
                      </span>
                      <span className="document-list__name">{documentLabel(documentId)}</span>
                      <span className="document-list__state">
                        {isSubmitted ? 'Submitted' : 'Missing'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="drawer__note">
              Submission status only. Verification is a separate workflow and is not inferred
              here. Editing documents belongs to the application module (Member 2).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
