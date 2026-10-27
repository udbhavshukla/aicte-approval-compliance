import { SAMPLE_APPLICATIONS } from "../data/sampleApplications";
import { assignOfficerToApplication } from "./officerAssignment";

/**
 * Data layer. Every component talks ONLY to these functions.
 * - Default: data lives in localStorage (key below) so it survives refresh.
 * - Backend mode: set VITE_API_URL (e.g. http://localhost:5000/api) in a .env file.
 *   Then the same functions call the shared Express backend (Member 5).
 */
const STORAGE_KEY = "aicte_applications";
const API = import.meta.env.VITE_API_URL || "";

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read saved applications, resetting to sample data.", e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_APPLICATIONS));
  return [...SAMPLE_APPLICATIONS];
}

function writeLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // Lets the dashboard (Member 1) and other modules refresh automatically.
  window.dispatchEvent(new Event("applications:changed"));
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

const nextId = (list) =>
  "APP" + (list.reduce((max, a) => Math.max(max, parseInt(a.id.replace("APP", ""), 10) || 100), 100) + 1);

export async function getApplications() {
  return API ? api("/applications") : readLocal();
}

export async function getApplicationById(id) {
  const list = await getApplications();
  return list.find((a) => a.id === id) || null;
}

export async function createApplication(data) {
  if (API) return api("/applications", { method: "POST", body: JSON.stringify(data) });
  const list = readLocal();
  const app = {
    id: nextId(list),
    collegeName: data.collegeName,
    type: data.type,
    description: data.description,
    submissionDate: data.submissionDate,
    dueDate: data.dueDate,
    requiredDocuments: data.requiredDocuments,
    submittedDocuments: data.submittedDocuments,
    status: "Submitted",
    assignedOfficer: null,
  };
  app.assignedOfficer = assignOfficerToApplication(app, list); // <-- Member 3's function is called here
  writeLocal([app, ...list]);
  return app;
}

function updateLocal(id, changes) {
  const list = readLocal();
  const updated = list.map((a) => (a.id === id ? { ...a, ...changes } : a));
  writeLocal(updated);
  return updated.find((a) => a.id === id);
}

export async function updateStatus(id, status) {
  if (API) return api(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  return updateLocal(id, { status });
}

export async function reassignOfficer(id, assignedOfficer) {
  if (API) return api(`/applications/${id}/reassign`, { method: "PATCH", body: JSON.stringify({ assignedOfficer }) });
  return updateLocal(id, { assignedOfficer });
}

export async function updateSubmittedDocuments(id, submittedDocuments) {
  if (API) return api(`/applications/${id}/documents`, { method: "PATCH", body: JSON.stringify({ submittedDocuments }) });
  return updateLocal(id, { submittedDocuments });
}
