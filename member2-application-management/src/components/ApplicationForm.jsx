import { useState } from "react";
import { APPLICATION_TYPES, REQUIRED_DOCUMENTS, todayISO } from "../constants";
import { createApplication } from "../services/applicationService";

const empty = () => ({
  collegeName: "",
  type: "",
  description: "",
  submissionDate: todayISO(),
  dueDate: "",
  submittedDocuments: [],
});

export default function ApplicationForm({ onCreated }) {
  const [form, setForm] = useState(empty());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleDoc = (doc) =>
    set(
      "submittedDocuments",
      form.submittedDocuments.includes(doc)
        ? form.submittedDocuments.filter((d) => d !== doc)
        : [...form.submittedDocuments, doc]
    );

  function validate() {
    const e = {};
    if (!form.collegeName.trim()) e.collegeName = "Enter the institution name.";
    if (!form.type) e.type = "Select an application type.";
    if (!form.description.trim()) e.description = "Enter a short description.";
    if (!form.submissionDate) e.submissionDate = "Select the submission date.";
    if (!form.dueDate) e.dueDate = "Select the due date.";
    else if (form.submissionDate && form.dueDate < form.submissionDate)
      e.dueDate = "Due date cannot be earlier than the submission date.";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const app = await createApplication({
        ...form,
        collegeName: form.collegeName.trim(),
        description: form.description.trim(),
        requiredDocuments: [...REQUIRED_DOCUMENTS],
      });
      setForm(empty());
      onCreated(app);
    } catch (err) {
      setErrors({ form: "Could not save the application. " + err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>New application</h2>
      {errors.form && <p className="error banner">{errors.form}</p>}

      <label>
        Institution / college name
        <input value={form.collegeName} onChange={(e) => set("collegeName", e.target.value)} placeholder="e.g. Demo Engineering College" />
        {errors.collegeName && <span className="error">{errors.collegeName}</span>}
      </label>

      <label>
        Application type
        <select value={form.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">Select a type</option>
          {APPLICATION_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        {errors.type && <span className="error">{errors.type}</span>}
      </label>

      <label>
        Application description
        <textarea rows="3" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What is this application for?" />
        {errors.description && <span className="error">{errors.description}</span>}
      </label>

      <div className="row">
        <label>
          Submission date
          <input type="date" value={form.submissionDate} onChange={(e) => set("submissionDate", e.target.value)} />
          {errors.submissionDate && <span className="error">{errors.submissionDate}</span>}
        </label>
        <label>
          Due date
          <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          {errors.dueDate && <span className="error">{errors.dueDate}</span>}
        </label>
      </div>

      <fieldset>
        <legend>Documents submitted with this application</legend>
        <p className="hint">All three documents are required. Unticked documents will show as missing.</p>
        {REQUIRED_DOCUMENTS.map((doc) => (
          <label key={doc} className="check">
            <input type="checkbox" checked={form.submittedDocuments.includes(doc)} onChange={() => toggleDoc(doc)} />
            {doc}
          </label>
        ))}
      </fieldset>

      <button className="btn primary" type="submit" disabled={saving}>
        {saving ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
