import {
  hasActiveFilters,
  type AlertFiltersState,
  type CategoryFilter,
  type SeverityFilter,
} from '../lib/alertFilters';
import { SearchIcon } from './icons';

interface AlertFiltersProps {
  filters: AlertFiltersState;
  onChange: (filters: AlertFiltersState) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}

export function AlertFilters({
  filters,
  onChange,
  onReset,
  resultCount,
  totalCount,
}: AlertFiltersProps) {
  const active = hasActiveFilters(filters);

  return (
    <form
      className="filters"
      aria-label="Filter compliance alerts"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="filters__row">
        <div className="field">
          <label htmlFor="alert-category">Alert category</label>
          <select
            id="alert-category"
            value={filters.category}
            onChange={(event) =>
              onChange({ ...filters, category: event.target.value as CategoryFilter })
            }
          >
            <option value="all">All categories</option>
            <option value="missing_documents">Missing documents</option>
            <option value="due_soon">Upcoming deadlines</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="alert-severity">Priority</label>
          <select
            id="alert-severity"
            value={filters.severity}
            onChange={(event) =>
              onChange({ ...filters, severity: event.target.value as SeverityFilter })
            }
          >
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
          </select>
        </div>

        <div className="field field--search">
          <label htmlFor="alert-search">Search</label>
          <div className="search-input">
            <SearchIcon className="search-input__icon" />
            <input
              id="alert-search"
              type="search"
              placeholder="Application ID, college or document"
              value={filters.query}
              onChange={(event) => onChange({ ...filters, query: event.target.value })}
            />
          </div>
        </div>

        <div className="filters__actions">
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={onReset}
            disabled={!active}
          >
            Reset filters
          </button>
        </div>
      </div>

      <p className="filter-result" role="status" aria-live="polite">
        Showing <strong>{resultCount}</strong> of <strong>{totalCount}</strong>{' '}
        {totalCount === 1 ? 'alert' : 'alerts'}
      </p>
    </form>
  );
}
