# Integration Guide — Member 4 (Compliance & Alerts)

This module is intentionally standalone. It can be consumed as an API, embedded
as React components, or its pure rule function can be imported into a shared
backend. The goal is **one source of truth for applications** and **no duplicated
alert counters**.

---

## 1. Data flow

```text
Shared application records
        │
        ▼
buildAlertsResponse(applications, referenceDate, options)
        │  pure, deterministic
        ▼
GET /api/alerts
        │
        ▼
React alerts interface (filters + summary + detail drawer)
```

The rules live in `backend/src/compliance/alerts.ts` and never import Express or
React. The API is a thin adapter over `buildAlertsResponse`. The frontend only
filters the returned alerts for display; it does not recalculate compliance.

---

## 2. Application contract

```typescript
interface Application {
  id: string;
  collegeName: string;
  type: string;
  status: string;
  assignedOfficer?: string | null;
  dueDate: string | null;       // YYYY-MM-DD only
  requiredDocuments: string[];  // stable snake_case ids
  submittedDocuments: string[]; // uploaded/submitted ids
}
```

Source: `backend/src/domain/application.types.ts`.
Frontend mirror: `frontend/src/types/compliance.ts`.

Keep this contract stable, or provide an adapter when importing records from the
shared backend. Do not create a second `Application` interface with different
field names and then copy data between them.

### Status policy

`backend/src/domain/application.constants.ts` is the single source of truth.
Terminal statuses currently are:

```typescript
['Approved', 'Rejected', 'Withdrawn', 'Completed']
```

They are compared case-insensitively and receive no active alerts. Confirm this
policy with the team and update the constant once, not in multiple components.

### Document policy

- Use stable identifiers such as `application_form`, `faculty_list`.
- A document is submitted only if its id appears in `submittedDocuments`.
- Verification is out of scope. Never rewrite “submitted” as “verified”.
- Fictional type rules are in `APPLICATION_TYPE_RULES`. Replace them with the
  agreed requirements; do not present them as official AICTE rules.
- When `requiredDocuments` is empty or blank, the central type mapping applies.
  When neither an explicit list nor a type mapping exists, the engine returns an
  `unknown_application_type` diagnostic instead of silently treating the record
  as compliant. Add every supported type to the central mapping.
- `GET /api/applications` returns documents already resolved and normalised, so
  consumers such as `ApplicationDialog` do not re-implement the policy. Keep
  using that endpoint rather than applying a second fallback in the UI.
- The read model also trims `id`, `collegeName`, `type`, `status` and
  `assignedOfficer`. This keeps application IDs aligned with
  `ComplianceAlert.applicationId`, including when upstream data has accidental
  whitespace.

---

## 3. Member 1 — main dashboard

Consume the API rather than rebuilding the rules:

```typescript
const response = await fetch(`${API_BASE_URL}/alerts`, {
  headers: { Accept: 'application/json' },
});
const data: AlertsResponse = await response.json();
```

Then reuse:

- `frontend/src/components/SummaryCards.tsx` — four summary cards.
- `frontend/src/components/AlertsTable.tsx` — alert list/table.
- `frontend/src/components/AlertFilters.tsx` — category, priority, search.
- `frontend/src/lib/alertFilters.ts` — presentation-only filtering.
- `frontend/src/components/ApplicationDialog.tsx` — optional detail drawer.

`SummaryCards` accepts `summary` and `dueSoonThresholdDays`. `AlertsTable`
accepts `alerts`, an `applicationsById` map and an `onOpenApplication` callback.
Navigation to Member 2's application screen can replace the drawer callback.

For the detail checklist, use `GET /api/applications` (or the same store read
model) rather than resolving type rules in the dashboard. That response already
contains resolved `requiredDocuments` and normalised `submittedDocuments`.

**Do not** hardcode dashboard counters or compute a second summary in the
dashboard. Use `data.summary` and `data.alerts` from the same response.

If the dashboard is server-rendered, call `buildAlertsResponse` directly or proxy
`GET /api/alerts`.

---

## 4. Member 2 — application creation and document submission

The compliance module never writes application data. When a document is
submitted, update the shared record:

```typescript
application.submittedDocuments = [
  ...new Set([...application.submittedDocuments, documentId]),
];
```

When an application type changes, either update `requiredDocuments` explicitly or
leave it empty so the central type mapping applies. New application types must be
added to `APPLICATION_TYPE_RULES`; otherwise the alerts response reports an
`unknown_application_type` diagnostic. Then invalidate/refetch the alerts:

```typescript
GET /api/alerts
```

The result updates automatically because `buildAlertsResponse` always evaluates
the current records. Recommended invariants:

- `dueDate` is `YYYY-MM-DD`, never a timestamp.
- Document ids are normalized (`trim()`, lower-case snake_case).
- A submitted document id matches a required document id.
- Verification status is stored separately and never inferred here.
- Completed/approved transitions are reflected in `status` so alerts close.

If adding mutation endpoints, put them in the shared application service and
authorise them server-side. Do not trust a frontend role check.

---

## 5. Member 3 — officer assignment

`assignedOfficer` is already part of the application contract and is copied onto
every alert. The interface displays it in the alert row and detail drawer.

To support richer assignment data later, keep this field as the display label or
add an adapter that maps the officer record to `assignedOfficer`. Do not add
assignment logic to the compliance engine.

---

## 6. Member 5 — shared backend and database

The temporary data layer is `backend/src/data/applicationStore.ts`. It exposes:

```typescript
interface ApplicationStore {
  list(): Application[];
  findById(id: string): Application | undefined;
}
```

Recommended integration:

1. Implement `ApplicationStore` against the shared repository/database.
2. Keep `list()` returning the same `Application` contract. The applications
   route resolves document rules for read output; the alert controller remains a
   separate read path.
3. Keep using `buildAlertsResponse(store.list(), referenceDate, options)` in the
   alerts controller. It is pure and does not care where records came from.
4. Store deadlines as date-only values (`DATE`, not `TIMESTAMP`).
5. Remove or gate `sampleApplications.ts` to development only.
6. Add authentication/authorisation middleware before `/api/alerts` and
   `/api/applications`. The alerts endpoint is read-only but exposes institution
   names and compliance state.
7. Add audit logging for protected mutations in Member 2's layer, not here.
8. Keep response fields additive; existing consumers rely on `alerts`,
   `summary`, `diagnostics` and `meta`.
9. Preserve the `unknown_application_type` diagnostic when new types are added;
   it is the safe failure mode for an unmapped document policy.

Do not create a second alert table or scheduled job solely for this prototype.
The deterministic read model can be calculated on request. If caching is needed
later, cache the output of `buildAlertsResponse` and invalidate it on application
or document changes.

---

## 7. Member 6 — demo and presentation

Suggested demo flow:

1. Open `http://localhost:5173`.
2. Point out the four summary cards: 4 missing-document alerts covering 6
   documents, 3 upcoming deadlines, 1 overdue application, 8 total.
3. Filter by **Overdue** to show the overdue application (5 days late) separated
   from approaching deadlines.
4. Open **View application** on `APP-2026-003` to show the two simultaneous
   alerts (overdue + missing document) and the document checklist.
5. Show the data-quality notice for `APP-2026-009` (invalid due date) to prove
   the module fails safely rather than escalating bad data.
6. Optionally use a fixed reference date for a reproducible demo:

```bash
curl "http://localhost:4000/api/alerts?referenceDate=2026-10-27"
```

State clearly that document requirements and the three-day window are
configurable prototype defaults, not official AICTE rules, and that the module
makes no automatic approval decisions. Sample data resets when the backend
restarts.

---

## 8. API client and environment

Frontend client: `frontend/src/api/alertsApi.ts`.
Base URL: `VITE_API_BASE_URL` (default `http://localhost:4000/api`).

If the team serves the API from the same origin, set:

```dotenv
VITE_API_BASE_URL=/api
```

Add a reverse proxy or Vite proxy in that case. Do not hardcode URLs in
components.

---

## 9. Testing contract changes

When changing statuses, document rules or date parsing:

```bash
npm test
npm run typecheck
npm run build
```

Keep the fixed reference date in tests (`2026-10-27`). Do not make tests depend
on the machine's current date. Add a test for every new terminal status or
document-rule branch.

---

## 10. Integration checklist

- [ ] Status list confirmed by the team; `COMPLETED_STATUSES` updated once.
- [ ] Fictional document requirements replaced or clearly labelled.
- [ ] Every supported application type exists in `APPLICATION_TYPE_RULES`.
- [ ] Application contract mapped to the shared backend (no duplicate interface).
- [ ] Document submission updates `submittedDocuments` server-side.
- [ ] Alert counts come from `GET /api/alerts`, not separate counters.
- [ ] Deadlines stored as date-only values.
- [ ] Authentication/authorisation added at the shared backend layer.
- [ ] Sample data gated to development.
- [ ] `npm test`, `npm run typecheck`, `npm run build` pass in the combined repo.
