import type { ComplianceDiagnostic } from '../types/compliance';
import { pluralise } from '../lib/format';
import { AlertCircleIcon } from './icons';

interface DiagnosticsBannerProps {
  diagnostics: ComplianceDiagnostic[];
}

const CODE_LABELS: Record<ComplianceDiagnostic['code'], string> = {
  invalid_due_date: 'Invalid due date',
  invalid_application: 'Invalid application record',
  unknown_application_type: 'Unknown application type',
};

export function DiagnosticsBanner({ diagnostics }: DiagnosticsBannerProps) {
  if (diagnostics.length === 0) return null;

  return (
    <aside className="diagnostics" aria-labelledby="diagnostics-title">
      <div className="diagnostics__icon" aria-hidden="true">
        <AlertCircleIcon />
      </div>
      <div>
        <h2 id="diagnostics-title">
          {pluralise(diagnostics.length, 'data quality notice')}
        </h2>
        <p>
          The records below could not be fully evaluated. Only the affected checks were skipped,
          to avoid false escalation or false compliance.
        </p>
        <ul>
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.applicationId ?? 'unknown'}-${diagnostic.code}-${index}`}>
              <strong>{diagnostic.applicationId ?? 'Unknown application'}</strong>
              <span> — {CODE_LABELS[diagnostic.code]}: {diagnostic.message}</span>
              {diagnostic.value ? <span className="diagnostics__value"> ({diagnostic.value})</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
