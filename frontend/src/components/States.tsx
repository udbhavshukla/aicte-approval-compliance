import { AlertCircleIcon, CheckIcon, FolderIcon } from './icons';

interface EmptyStateProps {
  filtered: boolean;
  onReset: () => void;
}

export function EmptyState({ filtered, onReset }: EmptyStateProps) {
  return (
    <div className="state">
      <span className="state__icon state__icon--empty" aria-hidden="true">
        {filtered ? <FolderIcon /> : <CheckIcon />}
      </span>
      <h3>{filtered ? 'No alerts match these filters' : 'No active compliance alerts'}</h3>
      <p>
        {filtered
          ? 'Adjust the category, priority or search term to see other alerts.'
          : 'Active applications currently have complete documents and deadlines outside the warning window.'}
      </p>
      {filtered && (
        <button type="button" className="button button--ghost button--small" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-label="Loading alerts">
      <span className="sr-only">Loading compliance alerts…</span>
      {[0, 1, 2, 3].map((row) => (
        <div className="skeleton-row" key={row} aria-hidden="true">
          <span className="skeleton skeleton--row-main" />
          <span className="skeleton skeleton--row-badge" />
          <span className="skeleton skeleton--row-text" />
          <span className="skeleton skeleton--row-short" />
        </div>
      ))}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon state__icon--error" aria-hidden="true">
        <AlertCircleIcon />
      </span>
      <h3>Unable to load compliance alerts</h3>
      <p>{message}</p>
      <p className="state__hint">
        Start the backend with <code>npm run dev:backend</code> and try again.
      </p>
      <button type="button" className="button button--primary button--small" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
