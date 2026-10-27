import { useState } from "react";
import ApplicationForm from "./components/ApplicationForm";
import ApplicationList from "./components/ApplicationList";
import ApplicationDetails from "./components/ApplicationDetails";
import Toast from "./components/Toast";

export default function App() {
  const [page, setPage] = useState("list"); // "list" | "form" | "details"
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState("");

  const openDetails = (id) => { setSelectedId(id); setPage("details"); };

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">AICTE Approval Workflow<small>Application management</small></div>
        <nav>
          <button className={page === "list" ? "active" : ""} onClick={() => setPage("list")}>Applications</button>
          <button className={page === "form" ? "active" : ""} onClick={() => setPage("form")}>New application</button>
        </nav>
      </header>

      <main>
        {page === "list" && <ApplicationList onView={openDetails} onNew={() => setPage("form")} />}
        {page === "form" && (
          <ApplicationForm
            onCreated={(app) => {
              setToast(`Application ${app.id} submitted and assigned to ${app.assignedOfficer || "an officer"}.`);
              openDetails(app.id);
            }}
          />
        )}
        {page === "details" && <ApplicationDetails id={selectedId} onBack={() => setPage("list")} notify={setToast} />}
      </main>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
