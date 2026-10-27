# Compliance & Alerts — SIH AICTE Approval Workflow (Member 4)

A standalone, deterministic compliance module for the SIH AICTE approval-workflow
prototype. It detects missing required documents, warns about deadlines within a
configurable three-calendar-day window, and flags active applications that are
overdue. The React interface displays the alerts, filters them, and opens the
relevant application record.

> This is a prototype. Document requirements, institutions, officers and dates
> are fictional. Nothing here asserts an official AICTE rule or makes an
> automatic approval, rejection, suspension or withdrawal decision.

---

## What is implemented

- **Backend:** Node.js + Express + TypeScript, with pure compliance rules and
  shared in-memory sample data.
- **Frontend:** React + TypeScript + Vite, responsive and accessible, using
  plain CSS (no Tailwind configuration risk).
- **Tests:** Vitest unit tests for every rule and API smoke tests with Supertest.
- **Integration contract:** one documented `Application` interface and one
  deterministic `getApplicationAlerts(application, referenceDate)` function.

---

## Quick start

### Prerequisites

- Node.js **20 or newer** (verified with Node 24)
- npm 10 or newer

### Install

```bash
cd sih-aicte-compliance
npm install
```

`npm install` installs the root, backend and frontend workspaces from one lockfile.

### Run both services

```bash
npm run dev
```

Then open:

- Frontend: **http://localhost:5173**
- Backend health: **http://localhost:4000/api/health**
- Alerts API: **http://localhost:4000/api/alerts**

`npm run dev` uses `concurrently`. To run the services in separate terminals:

```bash
npm run dev:backend     # terminal 1 — http://localhost:4000
npm run dev:frontend    # terminal 2 — http://localhost:5173
```

### Optional environment files

The defaults work without any `.env` file. To customise:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

```dotenv
# backend/.env
PORT=4000
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
```

```dotenv
# frontend/.env
VITE_API_BASE_URL=http://localhost:4000/api
```

Never put secrets in `VITE_*` variables: Vite exposes them to the browser.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run backend and frontend together |
| `npm run dev:backend` | Express API only, with `tsx watch` |
| `npm run dev:frontend` | Vite dev server only |
| `npm test` | Backend + frontend Vitest suites |
| `npm run typecheck` | TypeScript checks for both workspaces |
| `npm run build` | Production backend build and frontend bundle |
| `npm run check` | Typecheck + tests + build |
| `npm run start:backend` | Run the compiled backend (`backend/dist`) |
| `npm run preview:frontend` | Preview the production frontend on port 4173 |
| `npm audit` | Dependency vulnerability check |

---

## Project structure

Generated `node_modules/`, `dist/` and local `.env` files are ignored by Git.

```text
sih-aicte-compliance/
├── package.json                    # npm workspaces + root scripts
├── package-lock.json
├── .gitignore
├── README.md
├── docs/
│   └── INTEGRATION.md              # per-member integration guide
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.ts                  # Express app factory
│   │   ├── index.ts                # server bootstrap
│   │   ├── compliance/
│   │   │   ├── alerts.ts           # pure rules + response builder
│   │   │   └── alerts.types.ts     # alert/API response contract
│   │   ├── data/
│   │   │   ├── applicationStore.ts # temporary in-memory repository
│   │   │   └── sampleApplications.ts
│   │   ├── domain/
│   │   │   ├── application.constants.ts  # statuses + fictional doc rules
│   │   │   ├── application.types.ts      # shared Application contract
│   │   │   └── date.utils.ts             # date-only arithmetic
│   │   └── routes/
│   │       ├── health.routes.ts
│   │       ├── applications.routes.ts
│   │       └── alerts.routes.ts
│   └── tests/
│       ├── alerts.test.ts
│       ├── date.utils.test.ts
│       └── api.test.ts
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── .env.example
    ├── public/robots.txt
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── styles.css
        ├── api/alertsApi.ts        # central API client
        ├── components/
        │   ├── AlertFilters.tsx
        │   ├── AlertsTable.tsx
        │   ├── ApplicationDialog.tsx
        │   ├── DiagnosticsBanner.tsx
        │   ├── States.tsx
        │   ├── SummaryCards.tsx
        │   └── icons.tsx
        ├── lib/
        │   ├── alertFilters.ts
        │   ├── documents.ts
        │   └── format.ts
        └── types/compliance.ts     # frontend mirror of the API contract
```

---

## Shared application contract

Defined in `backend/src/domain/application.types.ts` and mirrored in
`frontend/src/types/compliance.ts`:

```typescript
interface Application {
  id: string;                 // stable id, e.g. "APP-2026-001"
  collegeName: string;
  type: string;               // "New Institution" | "Renewal" | ...
  status: string;             // central status definitions below
  assignedOfficer?: string | null;
  dueDate: string | null;     // strict ISO date-only: YYYY-MM-DD
  requiredDocuments: string[];// stable snake_case document ids
  submittedDocuments: string[];// uploaded/submitted document ids
}
```

### Document convention

- Document identifiers are stable `snake_case` keys, e.g. `application_form`,
  `faculty_list`, `financial_statement`.
- `requiredDocuments` and `submittedDocuments` must use the same identifiers.
- If `requiredDocuments` is empty, missing, or contains only blank values, the
  central fictional mapping for the application `type` is used
  (`backend/src/domain/application.constants.ts`).
- If neither an explicit list nor a configured type mapping exists, the engine
  does **not** silently treat the application as compliant. It emits an
  `unknown_application_type` diagnostic and skips missing-document detection for
  that record.
- `GET /api/applications` returns `requiredDocuments` already resolved through
  the same policy and `submittedDocuments` normalised (`trim`, deduplicated), so
  UI consumers such as the document checklist do not duplicate rule logic.
  Identifiers and display fields are trimmed to match `applicationId` in alerts.
- A document is treated as **submitted** only when its identifier is present in
  `submittedDocuments`. The prototype does not model verification, so it never
  labels a document as verified.
- Requirements are **fictional** and configurable. They are not official AICTE
  requirements.

### Status model

Central definitions live in `application.constants.ts`:

```typescript
const APPLICATION_STATUSES = [
  'Pending', 'Under Review', 'Query Raised',
  'Approved', 'Rejected', 'Withdrawn', 'Completed',
];

const COMPLETED_STATUSES = ['Approved', 'Rejected', 'Withdrawn', 'Completed'];
```

`COMPLETED_STATUSES` are terminal. Terminal applications receive **no active
alerts**, even if a document is absent or the deadline has passed. This keeps
closed records out of the operational queue. Rename or extend this list when the
team agrees on the shared status model.

---

## Alert contract

`getApplicationAlerts(application, referenceDate?, options?)` returns:

```typescript
interface ComplianceAlert {
  id: string;                       // stable dedupe key
  applicationId: string;
  collegeName: string;
  applicationType: string;
  applicationStatus: string;
  assignedOfficer: string | null;
  type: 'missing_documents' | 'due_soon' | 'overdue';
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  missingDocuments: { id: string; name: string }[];
  missingDocumentCount: number;
  dueDate: string | null;
  daysRemaining: number | null;     // 0..threshold for due_soon
  daysOverdue: number | null;       // positive for overdue
}
```

Stable alert ids are:

- `missing_documents:<applicationId>` — one consolidated alert per application
  listing every distinct missing document.
- `due_soon:<applicationId>`
- `overdue:<applicationId>`

This prevents duplicate alerts for the same application and condition, and the
response builder also deduplicates by id defensively.

`buildAlertsResponse(applications, referenceDate, options)` returns the full API
payload: alerts, summary counts, data-quality diagnostics and metadata. All
counts are derived from the same alert array.

### Summary shape

```typescript
interface AlertSummary {
  totalActiveAlerts: number;
  missingDocumentAlerts: number;   // applications with >=1 missing document
  upcomingDeadlineAlerts: number;
  overdueAlerts: number;
  missingDocumentTotal: number;    // total distinct missing documents
  critical: number;
  warning: number;
}
```

---

## The three rules

### A. Missing documents

- Resolve required documents from `application.requiredDocuments`, falling back
  to the central `type` mapping when the explicit list is empty or blank.
- Compare against `submittedDocuments` using exact, trimmed identifiers.
- Emit one alert containing every distinct missing document, with display names.
- Severity: `warning`.
- Recalculated on every call, so a submission update changes the result without
  restarting anything.
- Unknown application types with no configured or explicit requirements produce
  an `unknown_application_type` diagnostic instead of silently passing.

### B. Upcoming deadlines

- Parse strict `YYYY-MM-DD` dates and compare integer UTC epoch days.
- Warn when `0 <= daysRemaining <= dueSoonDays` (default **3**).
- Today is `daysRemaining: 0` and is shown as **critical**; 1–3 days is
  **warning**.
- The threshold is configurable through `options.dueSoonDays`, the API query
  `?dueSoonDays=`, or by changing the default constant.
- Missing `dueDate` (null/empty) produces no deadline alert.
- Invalid dates produce a diagnostic and are skipped safely. They are not
  counted as overdue.
- Terminal applications are excluded.

### C. Overdue applications

- Flag when `daysRemaining < 0` and the status is not terminal.
- Report `daysOverdue` as a positive whole number.
- Severity: `critical`.
- No automatic status change or enforcement action is made.
- Invalid or missing dates never crash the evaluation.

### Date-only correctness

`date.utils.ts` parses date-only strings into a canonical date and an integer
`epochDay` (`Math.floor(ms / 86_400_000)`), then compares epoch days. This avoids
DST offsets, timezone shifts and rounded millisecond differences. A `Date`
reference is interpreted using its **local** calendar fields because that is the
date the operator sees.

---

## API

Base URL: `http://localhost:4000/api`

### `GET /api/health`

```json
{ "status": "ok", "service": "sih-aicte-compliance-api", "timestamp": "..." }
```

### `GET /api/applications`

```json
{
  "applications": [ /* Application[] */ ],
  "count": 9,
  "meta": {
    "dataSource": "in-memory",
    "note": "Fictional sample data for the prototype. It resets when the backend restarts."
  }
}
```

Each returned record has its document state resolved for read use:
`requiredDocuments` is filled from the central type mapping when the stored list
is empty/blank, and `submittedDocuments` is trimmed and deduplicated. Identifiers
and display fields are trimmed too, so they match the alert engine's
`applicationId` and the drawer can always find the record. The alert engine
applies the same rules, so the list and the drawer cannot disagree.

### `GET /api/alerts`

Optional query parameters:

| Parameter | Description |
|---|---|
| `referenceDate` | Strict `YYYY-MM-DD` override for demos/tests. Defaults to today. |
| `dueSoonDays` | Integer 0–365 warning threshold. Defaults to 3. |

```bash
curl "http://localhost:4000/api/alerts?referenceDate=2026-10-27"
curl "http://localhost:4000/api/alerts?referenceDate=2026-10-27&dueSoonDays=5"
```

Response:

```json
{
  "alerts": [ /* ComplianceAlert[] sorted: overdue, due soon, missing */ ],
  "summary": { /* AlertSummary */ },
  "diagnostics": [ /* invalid dates, invalid records, unknown document policy */ ],
  "meta": {
    "referenceDate": "2026-10-27",
    "dueSoonThresholdDays": 3,
    "generatedAt": "2026-10-27T12:00:00.000Z",
    "dataSource": "in-memory"
  }
}
```

### Errors

```json
{ "error": { "code": "INVALID_REFERENCE_DATE", "message": "..." } }
```

- `400 INVALID_REFERENCE_DATE`
- `400 INVALID_DUE_SOON_DAYS`
- `404 NOT_FOUND`
- `500 INTERNAL_ERROR`

Data-quality diagnostics use `invalid_due_date`, `invalid_application` and
`unknown_application_type`. Diagnostics are not active alerts and never inflate
summary counts.

---

## Sample scenarios

Sample due dates are generated relative to the backend start date so the demo
always has visible scenarios. All records are fictional.

| Application | Type | Status | Due date | Scenario |
|---|---|---|---|---|
| APP-2026-001 | New Institution | Under Review | today | 2 missing documents + deadline today |
| APP-2026-002 | Increase in Intake | Pending | +2 days | Deadline approaching, documents complete |
| APP-2026-003 | Extension of Approval | Query Raised | −5 days | Overdue + 1 missing document |
| APP-2026-004 | Renewal | Under Review | +10 days | Normal, no alerts |
| APP-2026-005 | New Institution | Approved | −20 days | Terminal, no alerts |
| APP-2026-006 | Increase in Intake | Completed | −2 days | Terminal, no alerts |
| APP-2026-007 | Renewal | Pending | none | 1 missing document, no deadline alert |
| APP-2026-008 | Extension of Approval | Under Review | +3 days | Deadline in exactly 3 days + 2 missing |
| APP-2026-009 | Increase in Intake | Query Raised | invalid | Diagnostic, deadline checks skipped |

With reference date `2026-10-27` **and a backend started on that date**, the
expected summary is **8 active alerts**: 4 missing-document alerts (6 missing
documents), 3 upcoming deadlines and 1 overdue application, with 2 critical and
6 warnings.

---

## Tests and verification

Commands actually executed for this implementation:

```bash
npm run typecheck   # passed, both workspaces
npm test            # 89 backend tests + 14 frontend tests passed
npm run build       # passed; backend dist + frontend bundle
npm audit           # 0 vulnerabilities
```

Lighthouse on the production preview (`http://localhost:4173`) reported
**100 Accessibility, 100 Best Practices and 100 SEO** with no failures.

Test coverage includes: all documents present, one/multiple missing, submission
updates, thresholds at >3 / 3 / 2 / 1 / 0 days, yesterday overdue, completed and
approved exclusions, missing/invalid deadlines, multiple simultaneous alerts,
summary-count consistency, duplicate suppression, different document rules per
application type, unknown application types, blank document lists, malformed
records, empty data stores, leap days, month/year/DST boundaries, API validation,
CORS and security headers, and frontend filtering/formatting.

To rerun:

```bash
npm test
npm run typecheck
npm run build
```

---

## Integration

See **[docs/INTEGRATION.md](docs/INTEGRATION.md)** for per-member guidance. Short
version:

- **Member 1 (dashboard):** consume `GET /api/alerts` and reuse `SummaryCards`,
  `AlertFilters`/`AlertsTable` presentation components, or embed the API data.
  Do not maintain separate counters.
- **Member 2 (applications/documents):** update the shared application records
  and append document ids to `submittedDocuments`; the alert rules recalculate.
- **Member 3 (officers):** `assignedOfficer` is already present on applications
  and alerts.
- **Member 5 (backend integration):** replace `ApplicationStore` with the shared
  repository while preserving the `Application` contract and
  `buildAlertsResponse`.
- **Member 6 (demo):** use the sample scenarios and `referenceDate` query for a
  reproducible demonstration.

---

## Assumptions and limitations

1. **Fictional requirements.** Document lists and type mapping are invented for
   the prototype and must be confirmed by the domain owner.
2. **Submission ≠ verification.** `submittedDocuments` means uploaded/submitted.
   Verification is out of scope; the module never marks a document verified.
3. **Terminal statuses.** Approved, rejected, withdrawn and completed
   applications receive no active alerts. If missing-document monitoring is
   required for rejected/withdrawn records, change this policy explicitly.
4. **Three-day window.** A configurable prototype default, not an AICTE rule.
5. **In-memory data.** Data resets on backend restart. There is no database,
   scheduler, email/SMS provider, or automatic notification.
6. **No authentication.** The sample data is fictional. Any real deployment must
   add authentication, role-based authorisation and audit logging at the shared
   backend layer. Frontend permissions alone are not trusted.
7. **No automatic decisions.** The module never approves, rejects, suspends or
   withdraws an application.
8. **Single process.** The repository is a temporary source shared by the API;
   multi-instance deployments need the shared database owned by Member 5.
9. **Git.** This directory is inside an existing parent Git repository, so no
   nested repository was initialised. Add the module to the team's repository
   when it is available.
10. **Unknown application types.** When neither an explicit list nor a central
    type policy exists, missing-document detection is skipped and an
    `unknown_application_type` diagnostic is returned. Add new types to
    `APPLICATION_TYPE_RULES` before relying on their compliance results.

---

## Security notes

- No document contents, personal data or institution secrets are logged.
- API errors return generic messages and never echo records.
- `Cache-Control: no-store` is set on API responses.
- CORS is restricted to configured origins.
- The UI is marked `noindex, nofollow` and serves a disallowing `robots.txt`.
- `npm audit` reports 0 vulnerabilities at the time of implementation.
- Authentication/authorisation must be added during team integration.

---

## Troubleshooting

**Frontend shows “Unable to load compliance alerts”.**
Start the backend (`npm run dev:backend`) and confirm
`http://localhost:4000/api/health` responds.

**Port already in use.**
Set `PORT` for the backend and update `VITE_API_BASE_URL` in
`frontend/.env`, or stop the process using the port:

```bash
lsof -i :4000
lsof -i :5173
```

**CORS error in the browser.**
Add the frontend origin to `CORS_ORIGIN` in `backend/.env` and restart the API.

**Changing the frontend API URL.**
The browser reads `VITE_API_BASE_URL` at build/dev time. Restart Vite after
editing `.env`.

**Data looks stale or resets.**
Expected: the prototype uses in-memory data. Restarting the backend regenerates
the sample records and their relative due dates.

**Vite/esbuild install-script warning on npm 11.**
If Vite fails to start after a restricted install, run `npm rebuild esbuild` or
approve the `esbuild` install script with your npm security tooling.
