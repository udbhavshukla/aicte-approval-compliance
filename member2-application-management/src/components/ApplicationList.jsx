import { useEffect, useState } from "react";
import { STATUSES, getMissingDocuments, isOverdue } from "../constants";
import { getApplications } from "../services/applicationService";
import StatusBadge from "./StatusBadge";

export default function ApplicationList({ onView, onNew }) {
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => getApplications().then((d) => { setApps(d); setLoading(false); });
    load();
    window.addEventListener("applications:changed", load);
    return () => window.removeEventListener("applications:changed", load);
  }, []);

  const q = search.trim().toLowerCase();
  const visible = apps.filter(
    (a) =>
      (statusFilter === "All" || a.status === statusFilter) &&
      (!q || a.collegeName.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
  );

  return (
    <div className="card">
      <div className="toolbar">
        <h2>Applications <span className="count">{visible.length}</span></h2>
        <input className="search" placeholder="Search by college name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option>All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <p className="empty">Loading applications…</p> : visible.length === 0 ? (
        <div className="empty">
          <p>No applications match your search.</p>
          <button className="btn" onClick={onNew}>Add an application</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>College</th><th>Type</th><th>Submitted</th>
                <th>Due</th><th>Status</th><th>Officer</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.id}</strong></td>
                  <td>{a.collegeName}{getMissingDocuments(a).length > 0 && <span className="dot" title="Missing documents" />}</td>
                  <td>{a.type}</td>
                  <td>{a.submissionDate}</td>
                  <td className={isOverdue(a) ? "overdue" : ""}>{a.dueDate}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.assignedOfficer || <span className="muted">Unassigned</span>}</td>
                  <td><button className="btn small" onClick={() => onView(a.id)}>View details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
