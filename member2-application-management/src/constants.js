// Shared constants. Keep these identical across all team modules.
export const APPLICATION_TYPES = ["Engineering", "Management", "Approval Renewal"];

export const REQUIRED_DOCUMENTS = [
  "Institution Details",
  "Required Certificates",
  "Supporting Documents",
];

export const STATUSES = ["Submitted", "Under Review", "Action Required", "Approved", "Rejected"];

// Fictional officers used only for the simulated assignment / manual reassignment.
// Member 3 can replace this with their own officer data.
export const SAMPLE_OFFICERS = ["Officer A", "Officer B", "Officer C"];

export const todayISO = () => new Date().toISOString().slice(0, 10);

// Missing documents are DERIVED from the two shared fields (no extra field in the schema).
// Member 4 (alerts) should import and use this function.
export const getMissingDocuments = (app) =>
  app.requiredDocuments.filter((d) => !app.submittedDocuments.includes(d));

export const isOverdue = (app) =>
  app.dueDate < todayISO() && !["Approved", "Rejected"].includes(app.status);
