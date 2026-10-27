import { useEffect, useState } from "react";
import { STATUSES, SAMPLE_OFFICERS, getMissingDocuments, isOverdue } from "../constants";
import { getApplicationById, updateStatus, reassignOfficer, updateSubmittedDocuments } from "../services/applicationService";
import StatusBadge from "./StatusBadge";

export default function ApplicationDetails({ id, onBack, notify }) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => getApplicationById(id).then((a) => { setApp(a); setLoading(false); });
    load();
    window.addEventListener("applications:changed", load);
    return () => window.removeEventListener("applications:changed", load);
  }, [id]);

  if (loading) return <div className="card"><p className="empty">Loading…</p></div>;
  if (!app) return <div className="card"><p className="empty">Application {id} was not found.</p><button className="btn" onClick={onBack}>Back to list</button></div>;

  const missing = getMissingDocuments(app);

  async function change(fn, message) {
    try { setApp(await fn()); notify(message); } catch (e) { notify("Update failed: " + e.message); }
  }

  const toggleDoc = (doc) => {
    const next = app.submittedDocuments.includes(doc)
      ? app.submittedDocuments.filter((d) => d !== doc)
      : [...app.submittedDocuments, doc];
    change(() => updateSubmittedDocuments(app.id, next), `${doc} updated.`);
  };

  return (
    <div className="details">
      <button className="btn" onClick={onBack}>← Back to list</button>

      <div className="card">
        <div className="head">
          <div>
            <h2>{app.collegeName}</h2>
            <p className="muted">{app.id} · {app.type}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>
        <p>{app.description}</p>

        <dl className="grid">
          <div><dt>Submission date</dt><dd>{app.submissionDate}</dd></div>
          <div><dt>Due date</dt><dd className={isOverdue(app) ? "overdue" : ""}>{app.dueDate}{isOverdue(app) && " (overdue)"}</dd></div>
          <div><dt>Assigned officer</dt><dd>{app.assignedOfficer || "Unassigned"}</dd></div>
        </dl>

        <div className="row">
          <label>
            Change status
            <select value={app.status} onChange={(e) => change(() => updateStatus(app.id, e.target.value), `Status changed to ${e.target.value}.`)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Reassign officer
            <select value={app.assignedOfficer || ""} onChange={(e) => change(() => reassignOfficer(app.id, e.target.value), `Assigned to ${e.target.value}.`)}>
              <option value="" disabled>Select an officer</option>
              {SAMPLE_OFFICERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Documents</h3>
        {missing.length > 0 ? (
          <p className="alert">Missing {missing.length} of {app.requiredDocuments.length} documents: {missing.join(", ")}</p>
        ) : (
          <p className="ok">All required documents have been submitted.</p>
        )}
        <ul className="docs">
          {app.requiredDocuments.map((doc) => {
            const done = app.submittedDocuments.includes(doc);
            return (
              <li key={doc} className={done ? "done" : "missing"}>
                <span>{done ? "✔ Submitted" : "✖ Missing"} — {doc}</span>
                <button className="btn small" onClick={() => toggleDoc(doc)}>{done ? "Mark missing" : "Mark submitted"}</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
