import type { Application, ComplianceAlert } from '../types/compliance';
import {
  categoryLabel,
  formatDateOnly,
  formatTiming,
  severityLabel,
} from '../lib/format';

interface AlertsTableProps {
  alerts: ComplianceAlert[];
  applicationsById: Map<string, Application>;
  onOpenApplication: (applicationId: string) => void;
}

export function AlertsTable({
  alerts,
  applicationsById,
  onOpenApplication,
}: AlertsTableProps) {
  return (
    <div className="alerts-table-wrap">
      <table className="alerts-table">
        <caption className="sr-only">
          Active compliance alerts ordered by priority
        </caption>
        <thead>
          <tr>
            <th scope="col">Application</th>
            <th scope="col">Alert</th>
            <th scope="col">Description</th>
            <th scope="col">Due date</th>
            <th scope="col">Timing</th>
            <th scope="col">Priority</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const application = applicationsById.get(alert.applicationId);
            const dueDate = alert.dueDate ?? application?.dueDate ?? null;

            return (
              <tr key={alert.id}>
                <td data-label="Application">
                  <span className="application-id">{alert.applicationId}</span>
                  <span className="college-name">{alert.collegeName}</span>
                  <span className="application-type">{alert.applicationType}</span>
                </td>

                <td data-label="Alert">
                  <span className={`badge badge--${alert.type}`}>
                    {categoryLabel(alert.type)}
                  </span>
                  <span className="alert-title">{alert.title}</span>
                </td>

                <td data-label="Description">
                  <p className="alert-message">{alert.message}</p>
                  {alert.missingDocuments.length > 0 && (
                    <ul className="document-chips" aria-label="Missing documents">
                      {alert.missingDocuments.map((document) => (
                        <li className="document-chip" key={document.id}>
                          {document.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {alert.assignedOfficer && (
                    <p className="alert-officer">
                      Officer: <span>{alert.assignedOfficer}</span>
                    </p>
                  )}
                </td>

                <td data-label="Due date">
                  <span className="due-date">{formatDateOnly(dueDate)}</span>
                </td>

                <td data-label="Timing">
                  <span className={`timing timing--${alert.type}`}>
                    {formatTiming(alert)}
                  </span>
                </td>

                <td data-label="Priority">
                  <span className={`severity severity--${alert.severity}`}>
                    <span className="severity__dot" aria-hidden="true" />
                    {severityLabel(alert.severity)}
                  </span>
                </td>

                <td data-label="Action">
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => onOpenApplication(alert.applicationId)}
                  >
                    View application
                    <span className="sr-only"> {alert.applicationId}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
